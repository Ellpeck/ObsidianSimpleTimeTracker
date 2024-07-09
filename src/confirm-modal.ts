import { App, Modal, Setting } from "obsidian";

export class ConfirmModal extends Modal {
	// Message to show in the modal
	message: string;

	// Callback to run on user choice
	callback: (choice: boolean) => void;

	// Whether an option was picked
	picked: boolean;

	constructor(
		app: App,
		message: string,
		callback: (choice: boolean) => void
	) {
		super(app);
		this.message = message;
		this.callback = callback;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl("p", { text: this.message });

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Ok")
					.setCta()
					.onClick(() => {
						this.picked = true;
						this.close();
						this.callback(true);
					})
			)
			.addButton((btn) =>
				btn.setButtonText("Cancel").onClick(() => {
					this.picked = true;
					this.close();
					this.callback(false);
				})
			);
	}

	onClose(): void {
		if (!this.picked) {
			console.log("Fallback");
			this.callback(false);
		}
	}
}
