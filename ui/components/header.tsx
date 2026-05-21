import { editor } from "@silverbulletmd/silverbullet/syscalls";

type Props = {
	title: string;
	ghostCount: number;
	onExpandAll: () => void;
	onCollapseAll: () => void;
	hideEdgeLabels: boolean;
	onToggleHideEdgeLabels: (v: boolean) => void;
};

export function Header({
	title,
	ghostCount,
	onExpandAll,
	onCollapseAll,
	hideEdgeLabels,
	onToggleHideEdgeLabels,
}: Props) {
	return (
		<header class="gv-header">
			<h1 class="gv-header-title">{title}</h1>
			<div class="gv-header-actions">
				<label
					class="gv-header-toggle"
					title="Suppress edge labels on the canvas"
				>
					<input
						type="checkbox"
						checked={hideEdgeLabels}
						onChange={(e) =>
							onToggleHideEdgeLabels((e.target as HTMLInputElement).checked)
						}
					/>
					Hide labels
				</label>
				<button
					class="gv-header-button"
					title="Expand every visible ghost node"
					disabled={ghostCount === 0}
					onClick={onExpandAll}
				>
					Expand{ghostCount > 0 ? ` (${ghostCount})` : ""}
				</button>
				<button
					class="gv-header-button"
					title="Reset view to the selected object and its direct relations"
					onClick={onCollapseAll}
				>
					Focus
				</button>
				<button
					class="gv-close-button"
					title="Close (Esc)"
					onClick={() => editor.hidePanel("modal")}
				>
					×
				</button>
			</div>
		</header>
	);
}
