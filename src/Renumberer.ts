import { Editor, EditorChange } from "obsidian";
import { getItemNum, PATTERN } from "./utils";

export default class Renumberer {
    private changes: EditorChange[] = [];
    private linesToProcess: number[] = [];

    constructor(changes: EditorChange[]) {
        this.changes = changes;
    }

    apply(editor: Editor): boolean {
        if (this.linesToProcess.length === 0) {
            return false;
        }

        // renumber every line in the list
        let currLine: number | undefined;
        while ((currLine = this.linesToProcess.shift()) !== undefined) {
            this.renumberBlock(editor, currLine);
        }

        editor.transaction({ changes: this.changes });
        const hasMadeChanges = this.changes.length > 0 ? true : false;
        this.changes.splice(0, this.changes.length);

        return hasMadeChanges;
    }

    private renumberBlock(editor: Editor, currLine: number) {
        const linesInFile = editor.lastLine() + 1;
        const currNum = getItemNum(editor, currLine);

        if (currNum === -1) {
            return; // not a part of a numbered list
        }

        let prevNum = getItemNum(editor, currLine - 1);

        let flag: boolean;
        let expectedItemNum: number;

        // if it's not the first line in a numbered list, we match the number to the line above and check one extra time
        if (prevNum !== -1) {
            flag = false;
            expectedItemNum = prevNum + 1;
        } else {
            flag = true;
            expectedItemNum = currNum + 1;
            currLine++;
        }

        // TODO make the comparison string-based, to avoid scientific notations, also need to make it larger than Number

        while (currLine < linesInFile) {
            const lineText = editor.getLine(currLine);
            const match = lineText.match(PATTERN);

            if (match === null) {
                break;
            }

            // if a change is required (expected != actual), push it to the changes list
            if (expectedItemNum !== parseInt(match[1])) {
                const newLineText = lineText.replace(match[0], `${expectedItemNum}. `);

                this.changes.push({
                    from: { line: currLine, ch: 0 },
                    to: { line: currLine, ch: lineText.length },
                    text: newLineText,
                });
            } else if (flag) {
                break; // ensure changes are made locally, not until the end of the block
            }

            flag = true;
            currLine++;
            expectedItemNum++;
        }

        return;
    }

    addLines(...lines: (number | number[])[]) {
        const linesToProcess: number[] = lines
            .flat()
            .filter((line) => typeof line === "number" && line >= 0) as number[];
        this.linesToProcess.push(...linesToProcess);
    }

    getLines() {
        return this.linesToProcess;
    }
}
