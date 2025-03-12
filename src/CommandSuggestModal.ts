import { App, SuggestModal } from "obsidian";

interface CommandOption {
    id: string;
    name: string;
}

export class CommandSuggestModal extends SuggestModal<CommandOption> {
    private onChoose: (command: CommandOption) => void;

    constructor(app: App, onChoose: (command: CommandOption) => void) {
        super(app);
        this.onChoose = onChoose;
    }

    getSuggestions(query: string): CommandOption[] {
        const commands = Object.values((this.app as any).commands.commands).map(
            (cmd: any) => ({ id: cmd.id, name: cmd.name })
        );
        return commands.filter(
            (cmd) =>
                cmd.name.toLowerCase().includes(query.toLowerCase()) ||
                cmd.id.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(command: CommandOption, el: HTMLElement) {
        el.createEl("div", { text: `${command.name} (${command.id})` });
    }

    onChooseSuggestion(
        command: CommandOption,
        evt: MouseEvent | KeyboardEvent
    ) {
        this.onChoose(command);
    }
}
