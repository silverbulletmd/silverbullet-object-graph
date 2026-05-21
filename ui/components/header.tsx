import { editor } from "@silverbulletmd/silverbullet/syscalls";

type Props = {
	ghostCount: number;
	onExpandAll: () => void;
	onCollapseAll: () => void;
	hideEdgeLabels: boolean;
	onToggleHideEdgeLabels: (v: boolean) => void;
	hideOrphans: boolean;
	onToggleHideOrphans: (v: boolean) => void;
};

export function Header({
	ghostCount,
	onExpandAll,
	onCollapseAll,
	hideEdgeLabels,
	onToggleHideEdgeLabels,
	hideOrphans,
	onToggleHideOrphans,
}: Props) {
	return (
		<header class="gv-header">
			<h1 class="gv-header-title">Object Graph</h1>
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
				<label
					class="gv-header-toggle"
					title="Hide nodes with no visible incoming or outgoing relation"
				>
					<input
						type="checkbox"
						checked={hideOrphans}
						onChange={(e) =>
							onToggleHideOrphans((e.target as HTMLInputElement).checked)
						}
					/>
					Hide orphans
				</label>
				<button
					class="gv-header-button"
					title="Follow every enabled relation outward until no ghosts remain"
					disabled={ghostCount === 0}
					onClick={onExpandAll}
				>
					Expand all
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
