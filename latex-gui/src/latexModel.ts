// src/latexModel.ts

export type NodeType =
    | 'document'
    | 'chapter'
    | 'section'
    | 'subsection'
    | 'text'
    | 'table'
    | 'figure'
    | 'pagebreak'
    | 'equation';

export interface BaseNode {
    id: string;
    type: NodeType;
    title?: string;      // chapter / section / subsection
    content?: string;    // text
    children?: DocNode[];
}

export interface TableColumn {
    align: 'l' | 'c' | 'r'; // LaTeX alignment
    width?: string; // e.g. '3cm' -> p{3cm}
}

export type TableWidthMode = 'natural' | 'textwidth' | 'resize';
export type TableStyle = 'default' | 'booktabs' | 'striped' | 'minimal';

export interface TableNode extends BaseNode {
    type: 'table';
    rows: number;
    cols: number;
    cells: string[][];
    cellColors: (string | null)[][];
    caption: string;
    label: string;
    columns: TableColumn[];
    hasHeader: boolean;

    widthMode: TableWidthMode; // natural / fit to textwidth / scale
    maxWidthFactor: number; // for resize: fraction of \textwidth
    hPadding: string; // \tabcolsep, e.g. "0.5em"

    tableStyle: TableStyle;
}

export interface FigureNode extends BaseNode {
    type: 'figure';
    imagePath: string;
    width: number; // 0–1
    caption: string;
    label: string;
}

export interface PageBreakNode extends BaseNode {
    type: 'pagebreak';
}

export type EquationMode = 'inline' | 'display';

export interface EquationNode extends BaseNode {
    type: 'equation';
    mode: EquationMode;
    latex: string;
    numbered: boolean;
}

export type DocNode = BaseNode | TableNode | FigureNode | PageBreakNode | EquationNode;

export interface DocumentRoot extends BaseNode {
    type: 'document';
    title: string;
    author: string;
    docClass: 'article' | 'report';
    includeToc: boolean;
    children: DocNode[];
}


// ---------- helpers ----------

export function createEmptyDocument(): DocumentRoot {
    return {
        id: 'doc-1',
        type: 'document',
        title: 'My Report',
        author: 'Author',
        docClass: 'article',
        includeToc: true,
        children: [],
    };
}

function esc(s: string | undefined): string {
    return (s ?? '').replace(/_/g, '\\_');
}

// ---------- LaTeX generator ----------

export function generateLatex(doc: DocumentRoot): string {
    const lines: string[] = [];

    lines.push(
        `\\documentclass[11pt,a4paper]{${doc.docClass}}`,
        '\\usepackage{geometry}',
        '\\usepackage{graphicx}',
        '\\usepackage{booktabs}', // for table styles
        '\\usepackage{array}',
        '\\usepackage{tabularx}',
        '\\usepackage{amsmath}',
        '\\usepackage[table]{xcolor}', // colors in tables
        '\\usepackage{colortbl}',
        '\\usepackage{hyperref}',
        '',
        '\\begin{document}',
        `\\title{${esc(doc.title)}}`,
        `\\author{${esc(doc.author)}}`,
        '\\date{\\today}',
        '\\maketitle'
    );

    if (doc.includeToc) {
        lines.push('\\tableofcontents', '');
        lines.push('\\newpage');
        lines.push('\\listoffigures', '');
        lines.push('\\newpage');
        lines.push('\\listoftables', '');
        lines.push('\\newpage');
    }
    if (doc.docClass === 'report') {
        lines.push('\\chapter{Introduction}', '');
    }
    doc.children.forEach((c) => emitNode(c, lines));
    lines.push('', '\\end{document}');
    return lines.join('\n');
}

function emitNode(node: DocNode, out: string[]) {
    switch (node.type) {
        case 'chapter':
            // will give proper 1, 2, 3 numbering when docClass=report
            out.push(`\\chapter{${esc(node.title)}}`, '');
            break;
        case 'section':
            out.push(`\\section{${esc(node.title)}}`, '');
            break;
        case 'subsection':
            out.push(`\\subsection{${esc(node.title)}}`, '');
            break;
        case 'equation':
            const eq = node as EquationNode;
            if (eq.mode === 'inline') {
                // inline: keep it on its own line but using \( ... \)
                out.push(`\\(${eq.latex}\\)`, '');
            } else {
                // display: numbered vs unnumbered
                const env = eq.numbered ? 'equation' : 'equation*';
                out.push(
                    `\\begin{${env}}`,
                    eq.latex,
                    `\\end{${env}}`,
                    ''
                );
            }
            break;
        case 'text':
            if (node.content) out.push(esc(node.content), '');
            break;
        case 'table':
            emitTable(node as TableNode, out);
            break;
        case 'figure':
            emitFigure(node as FigureNode, out);
            break;
        case 'pagebreak':
            out.push('\\newpage', '');
            break;
        default:
            break;
    }
    node.children?.forEach((c) => emitNode(c, out));
}

function emitTable(node: TableNode, out: string[]) {
    // padding
    out.push(`\\setlength{\\tabcolsep}{${node.hPadding}}`);

    const colSpecInner = node.columns
        .map((col) => (col.width ? `p{${col.width}}` : col.align))
        .join('|');
    const colSpecWrapped =
        node.tableStyle === 'booktabs' || node.tableStyle === 'minimal'
            ? colSpecInner || 'c'
            : '|' + (colSpecInner || 'c') + '|';

    const bodyLines: string[] = [];

    // begin tabular
    bodyLines.push(`  \\begin{tabular}{${colSpecWrapped}}`);

    // rules depending on style
    if (node.tableStyle === 'booktabs') {
        bodyLines.push('    \\toprule');
    } else if (node.tableStyle !== 'minimal') {
        bodyLines.push('    \\hline');
    }

    for (let r = 0; r < node.rows; r++) {
        const row = node.cells[r] || [];
        const colorRow = node.cellColors[r] || [];
        const cellsRendered = row.map((c, colIdx) => {
            const color = colorRow[colIdx];
            const content = esc(c ?? '');
            return color ? `\\cellcolor{${color}} ${content}` : content;
        });
        bodyLines.push('    ' + cellsRendered.join(' & ') + ' \\\\');

        if (r === 0 && node.hasHeader) {
            if (node.tableStyle === 'booktabs') {
                bodyLines.push('    \\midrule');
            } else if (node.tableStyle !== 'minimal') {
                bodyLines.push('    \\hline');
            }
        }
    }

    if (node.tableStyle === 'booktabs') {
        bodyLines.push('    \\bottomrule');
    } else if (node.tableStyle !== 'minimal') {
        bodyLines.push('    \\hline');
    }

    bodyLines.push('  \\end{tabular}');

    out.push(
        '\\begin{table}[htbp]',
        '  \\centering',
        `  \\caption{${esc(node.caption)}}`,
        `  \\label{tab:${esc(node.label)}}`
    );

    // striped style: alternating row colors (excluding header)
    if (node.tableStyle === 'striped') {
        out.push('  \\rowcolors{2}{gray!10}{white}');
    }

    if (node.widthMode === 'textwidth') {
        out.push('  \\resizebox{\\textwidth}{!}{%', ...bodyLines, '  }');
    } else if (node.widthMode === 'resize') {
        out.push(
            `  \\resizebox{${node.maxWidthFactor.toFixed(
                2
            )}\\textwidth}{!}{%`,
            ...bodyLines,
            '  }'
        );
    } else {
        out.push(...bodyLines);
    }

    out.push('\\end{table}', '');
}

function emitFigure(node: FigureNode, out: string[]) {
    out.push(
        '\\begin{figure}[htbp]',
        '  \\centering',
        `  \\includegraphics[width=${node.width.toFixed(2)}\\textwidth]{${esc(
            node.imagePath
        )}}`,
        `  \\caption{${esc(node.caption)}}`,
        `  \\label{fig:${node.label}}`,
        '\\end{figure}',
        ''
    );
}



