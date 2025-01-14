// RenumberingUtils.ts
import { Editor, EditorChange } from "obsidian";
import IndentTracker from "./IndentTracker";
import { PendingChanges } from "../types";
import { getLineInfo } from "../utils";

// performs the calculation itself
export default function generateChanges(
    editor: Editor,
    index: number,
    indentTracker: IndentTracker,
    shouldRenumberFromOne: boolean,
    isLocal = true
): PendingChanges {
    const changes: EditorChange[] = [];
    const lastIndex = editor.lastLine() + 1;

    if (index < 0 || lastIndex <= index) {
        return { changes: [], endIndex: index };
    }
    // console.log("inside - index: ", index, "tracker: ", indentTracker);

    index = index === 0 ? 1 : index;

    let firstChange = true;
    let prevSpaceIndent = getLineInfo(editor.getLine(index - 1)).spaceIndent;

    for (; index < lastIndex; index++) {
        const text = editor.getLine(index);

        const { spaceIndent, spaceCharsNum, number: currNum, textIndex } = getLineInfo(text);

        // console.log("tracker: ", indentTracker.get());
        // console.debug(`line: ${index}, spaceIndent: ${spaceIndent}, curr num: ${currNum}, text index: ${textIndex}`);

        // make sure indented text does not stop the search
        if (currNum === undefined) {
            firstChange = false;
            if (prevSpaceIndent < spaceIndent) {
                indentTracker.insert(text);
                continue;
            }
            break;
        }

        const previousNum = indentTracker.get()[spaceIndent];
        let expectedNum = previousNum === undefined ? undefined : previousNum + 1;

        // console.log("index", index, "previous num", previousNum, "expected: ", expectedNum);

        const applyTextChange = (newText: string) => {
            changes.push({
                from: { line: index, ch: 0 },
                to: { line: index, ch: text.length },
                text: newText,
            });
        };

        const firstItemOnNewIndent = expectedNum === undefined;
        const shouldUpdateToOne = shouldRenumberFromOne && firstItemOnNewIndent && prevSpaceIndent < spaceIndent;
        const isValidIndent = spaceIndent <= indentTracker.lastIndex() + 1;
        const isNumChanged = expectedNum !== currNum;
        const shouldUpdate = expectedNum !== undefined && isNumChanged && isValidIndent; // if is different from expected number

        // console.log("currnum: ", currNum, "expected", expectedNum, "index", index);
        // if a change is required (expected != actual), push it to the changes list
        let newText = text;
        if (shouldUpdateToOne) {
            expectedNum = 1;
            newText = `${text.slice(0, spaceCharsNum)}${expectedNum}. ${text.slice(textIndex)}`;
            applyTextChange(newText);
        } else if (shouldUpdate) {
            newText = `${text.slice(0, spaceCharsNum)}${expectedNum}. ${text.slice(textIndex)}`;
            applyTextChange(newText);
        } else if (isLocal && !firstChange && spaceIndent === 0) {
            break; // ensures changes are made locally, not until the end of the numbered list
        }

        indentTracker.insert(newText);
        prevSpaceIndent = spaceIndent;
        firstChange = false;
    }

    return { changes, endIndex: index - 1 };
}
