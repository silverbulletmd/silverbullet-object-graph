import { datastore, system } from "@silverbulletmd/silverbullet/syscalls";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "preact/hooks";
import type {
	Edge,
	ExpansionResult,
	Filters,
	ObjectNode,
	RootViewModel,
} from "../../src/model.ts";
import { GraphCanvas } from "./graph_canvas.tsx";
import { Header } from "./header.tsx";
import { Sidebar } from "./sidebar.tsx";

const FILTERS_KEY = ["plug", "object-graph", "filters"];

type NodeState = { node: ObjectNode; status: "expanded" | "ghost" };

function edgeKey(e: Edge): string {
	return `${e.source} ${e.target} ${e.label} ${e.kind}`;
}

export function App({ vm }: { vm: RootViewModel }) {
	const [nodes, setNodes] = useState<Map<string, NodeState>>(() => {
		const m = new Map<string, NodeState>();
		const initialStatus: NodeState["status"] = vm.initialAllExpanded
			? "expanded"
			: "ghost";
		m.set(vm.root.object.ref, { node: vm.root.object, status: "expanded" });
		for (const n of vm.root.neighbors) {
			if (!m.has(n.ref)) m.set(n.ref, { node: n, status: initialStatus });
		}
		return m;
	});
	const [edges, setEdges] = useState<Edge[]>(() => [...vm.root.edges]);
	// Derived dedupe index kept in lock-step with `edges`. Lives in a ref
	// (not state) because we mutate it in place and never want it to be a
	// trigger for re-renders.
	const edgeKeysRef = useRef<Set<string>>(new Set(vm.root.edges.map(edgeKey)));
	const [selectedRef, setSelectedRef] = useState<string | null>(
		vm.root.object.ref,
	);
	const [filters, setFilters] = useState<Filters>(vm.filters);
	const [sidebarWidth, setSidebarWidth] = useState<number>(230);
	const [cache] = useState<Map<string, ExpansionResult>>(() => {
		const m = new Map<string, ExpansionResult>();
		m.set(vm.root.object.ref, vm.root);
		return m;
	});

	// Persist filters whenever they change. Disabled for transient modes
	// (e.g. the global view) so they don't trample the local view's saved
	// preferences. Skip the initial mount — those values came FROM the
	// datastore (or the view's preset) and writing them back is pointless.
	const persistFilters = vm.persistFilters !== false;
	const didMountRef = useRef(false);
	useEffect(() => {
		if (!persistFilters) return;
		if (!didMountRef.current) {
			didMountRef.current = true;
			return;
		}
		void datastore.set(FILTERS_KEY, filters);
	}, [filters, persistFilters]);

	const fetchExpansion = useCallback(
		async (ref: string): Promise<ExpansionResult> => {
			const cached = cache.get(ref);
			if (cached) return cached;
			const result = (await system.invokeFunction(
				"object-graph.expandObject",
				ref,
			)) as ExpansionResult;
			cache.set(ref, result);
			return result;
		},
		[cache],
	);

	const applyExpansions = useCallback((results: ExpansionResult[]) => {
		if (results.length === 0) return;
		setNodes((prev) => {
			const next = new Map(prev);
			for (const r of results) {
				next.set(r.object.ref, { node: r.object, status: "expanded" });
				for (const n of r.neighbors) {
					if (!next.has(n.ref)) next.set(n.ref, { node: n, status: "ghost" });
				}
			}
			return next;
		});
		setEdges((prev) => {
			const additions: Edge[] = [];
			const keys = edgeKeysRef.current;
			for (const r of results) {
				for (const e of r.edges) {
					const k = edgeKey(e);
					if (!keys.has(k)) {
						keys.add(k);
						additions.push(e);
					}
				}
			}
			return additions.length ? [...prev, ...additions] : prev;
		});
	}, []);

	const expandRef = useCallback(
		async (ref: string) => {
			applyExpansions([await fetchExpansion(ref)]);
		},
		[applyExpansions, fetchExpansion],
	);

	const onNodeClick = useCallback(
		(ref: string) => {
			const state = nodes.get(ref);
			setSelectedRef(ref);
			if (state && state.status === "ghost") {
				void expandRef(ref);
			}
		},
		[nodes, expandRef],
	);

	const removeNode = useCallback((ref: string) => {
		setNodes((prev) => {
			if (!prev.has(ref)) return prev;
			const next = new Map(prev);
			next.delete(ref);
			return next;
		});
		setEdges((prev) => {
			const remaining: Edge[] = [];
			const keys = edgeKeysRef.current;
			for (const e of prev) {
				if (e.source === ref || e.target === ref) {
					keys.delete(edgeKey(e));
					continue;
				}
				remaining.push(e);
			}
			return remaining.length === prev.length ? prev : remaining;
		});
		setSelectedRef((sel) => (sel === ref ? null : sel));
	}, []);

	const selected: ObjectNode | null = selectedRef
		? (nodes.get(selectedRef)?.node ?? null)
		: null;

	// Stable ref to the current visibleNodes so callbacks always see the latest
	// set without forcing the callback identity to churn on every filter tweak.
	const visibleNodesRef = useRef<NodeState[]>([]);

	const expandAllVisibleGhosts = useCallback(async () => {
		const ghostRefs = visibleNodesRef.current
			.filter((ns) => ns.status === "ghost")
			.map((ns) => ns.node.ref);
		if (ghostRefs.length === 0) return;
		// Fetch in parallel; apply as one batched update.
		const results = await Promise.all(ghostRefs.map(fetchExpansion));
		applyExpansions(results);
	}, [fetchExpansion, applyExpansions]);

	/**
	 * Reset the explored set to "currently-selected object + its 1-hop
	 * ghosts". The selection stays put; only the broader exploration is
	 * collapsed back to that node's immediate neighborhood.
	 */
	const collapseAll = useCallback(async () => {
		const anchor = selectedRef ?? vm.root.object.ref;
		const result = await fetchExpansion(anchor);
		const m = new Map<string, NodeState>();
		m.set(result.object.ref, { node: result.object, status: "expanded" });
		for (const n of result.neighbors) {
			if (!m.has(n.ref)) m.set(n.ref, { node: n, status: "ghost" });
		}
		setNodes(m);
		setEdges([...result.edges]);
		const keys = edgeKeysRef.current;
		keys.clear();
		for (const e of result.edges) keys.add(edgeKey(e));
		setSelectedRef(result.object.ref);
	}, [selectedRef, fetchExpansion, vm.root.object.ref]);

	// Keyboard: Backspace / Delete removes selected, unless focused in an input.
	useEffect(() => {
		const handler = (ev: KeyboardEvent) => {
			if (ev.key !== "Backspace" && ev.key !== "Delete") return;
			const tag = (ev.target as HTMLElement | null)?.tagName?.toLowerCase();
			if (tag === "input" || tag === "textarea" || tag === "select") return;
			if (!selectedRef) return;
			ev.preventDefault();
			removeNode(selectedRef);
		};
		globalThis.addEventListener("keydown", handler);
		return () => globalThis.removeEventListener("keydown", handler);
	}, [selectedRef, removeNode]);

	// Visible subgraph (view-layer only). Filter rules:
	//   • The root is always visible — it's the user's anchor into the graph.
	//   • Every other node (expanded or ghost) must pass the tag filter.
	//   • Edges must pass the label filter and connect two visible nodes.
	//   • A ghost that has no remaining edges to a visible neighbor is
	//     hidden — otherwise unchecking an edge label leaves orphan ghosts
	//     floating with no visible reason to be there.
	const rootRef = vm.root.object.ref;
	const { visibleNodes, visibleEdges } = useMemo(() => {
		function passesTags(n: ObjectNode): boolean {
			if (n.ref === rootRef) return true;
			if (n.tags.length === 0) {
				return !filters.hiddenTags.includes("(untagged)");
			}
			return n.tags.some((t) => !filters.hiddenTags.includes(t));
		}

		// Stage 1 — candidate set: tag filter applies uniformly (root excepted).
		const candidate = new Set<string>();
		for (const ns of nodes.values()) {
			if (passesTags(ns.node)) candidate.add(ns.node.ref);
		}

		// Stage 2 — edges that survive label filter AND connect candidates.
		const labeledEdges = edges.filter(
			(e) =>
				candidate.has(e.source) &&
				candidate.has(e.target) &&
				!filters.hiddenLabels.includes(e.label),
		);

		// Stage 3 — degree-by-visible-edge; ghosts need at least one connection.
		const degree = new Map<string, number>();
		for (const e of labeledEdges) {
			degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
			degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
		}

		const out: NodeState[] = [];
		for (const ns of nodes.values()) {
			if (!candidate.has(ns.node.ref)) continue;
			// Root and expanded nodes stay even without a visible connection;
			// ghosts need at least one to avoid floating-orphan visuals.
			if (
				ns.node.ref === rootRef ||
				ns.status === "expanded" ||
				(degree.get(ns.node.ref) ?? 0) > 0
			) {
				out.push(ns);
			}
		}

		const visibleRefSet = new Set(out.map((ns) => ns.node.ref));
		const edgesOut = labeledEdges.filter(
			(e) => visibleRefSet.has(e.source) && visibleRefSet.has(e.target),
		);

		return { visibleNodes: out, visibleEdges: edgesOut };
	}, [nodes, edges, filters, rootRef]);

	// Keep the ref in sync so expandAllVisibleGhosts sees the latest set.
	visibleNodesRef.current = visibleNodes;

	const ghostCount = visibleNodes.reduce(
		(a, ns) => a + (ns.status === "ghost" ? 1 : 0),
		0,
	);

	// Stable arrays for the sidebar's tally inputs (the underlying state
	// changes only when nodes/edges actually change; without these, every
	// App render would produce fresh array identities and re-tally everything).
	const allObjectNodes = useMemo(
		() => [...nodes.values()].map((ns) => ns.node),
		[nodes],
	);
	const visibleObjectNodes = useMemo(
		() => visibleNodes.map((ns) => ns.node),
		[visibleNodes],
	);

	return (
		<div class="gv-app">
			<Header
				title={vm.root.object.title}
				ghostCount={ghostCount}
				onExpandAll={expandAllVisibleGhosts}
				onCollapseAll={collapseAll}
				hideEdgeLabels={filters.hideEdgeLabels}
				onToggleHideEdgeLabels={(v) =>
					setFilters({ ...filters, hideEdgeLabels: v })
				}
			/>
			<div
				class="gv-body"
				style={{ "--gv-sidebar-width": `${sidebarWidth}px` }}
			>
				<Sidebar
					nodes={visibleObjectNodes}
					edges={visibleEdges}
					allNodes={allObjectNodes}
					allEdges={edges}
					universe={vm.universe}
					filters={filters}
					onFiltersChange={setFilters}
					selected={selected}
				/>
				<SidebarResizer width={sidebarWidth} onResize={setSidebarWidth} />
				<GraphCanvas
					nodes={visibleNodes}
					edges={visibleEdges}
					selectedRef={selectedRef}
					onNodeClick={onNodeClick}
					hideEdgeLabels={filters.hideEdgeLabels}
				/>
			</div>
		</div>
	);
}

const MIN_SIDEBAR_WIDTH = 160;
const MAX_SIDEBAR_WIDTH = 600;

function SidebarResizer({
	width,
	onResize,
}: {
	width: number;
	onResize: (w: number) => void;
}) {
	const [dragging, setDragging] = useState(false);
	const startRef = useRef<{ x: number; w: number } | null>(null);

	useEffect(() => {
		if (!dragging) return;
		const onMove = (e: MouseEvent) => {
			const start = startRef.current;
			if (!start) return;
			const next = Math.min(
				MAX_SIDEBAR_WIDTH,
				Math.max(MIN_SIDEBAR_WIDTH, start.w + (e.clientX - start.x)),
			);
			onResize(next);
		};
		const onUp = () => setDragging(false);
		globalThis.addEventListener("mousemove", onMove);
		globalThis.addEventListener("mouseup", onUp);
		return () => {
			globalThis.removeEventListener("mousemove", onMove);
			globalThis.removeEventListener("mouseup", onUp);
		};
	}, [dragging, onResize]);

	return (
		<div
			class={`gv-resizer${dragging ? " dragging" : ""}`}
			onMouseDown={(e) => {
				startRef.current = { x: e.clientX, w: width };
				setDragging(true);
				e.preventDefault();
			}}
		/>
	);
}
