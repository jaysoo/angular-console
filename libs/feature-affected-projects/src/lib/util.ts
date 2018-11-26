export interface SankeyDiagram {
  nodes: any[];
  links: any[];
}

interface AffectedProject {
  projectName: string;
  type: string;
}

interface Deps {
  [project: string]: AffectedProject[];
}

export interface DepGraph {
  deps: Deps;
  criticalPath: string[];
  projectTypes: any;
}

interface NodeLookupTable {
  [name: string]: NodeLookupTableEntry;
}

interface NodeLookupTableEntry {
  name: string;
  sources: NodeLookupTableEntry[];
  targets: NodeLookupTableEntry[];
  isIncluded: null | boolean;
  isVisited: boolean;
}

/*
Transforms the dep graph from nx to sankey graph data.

Supports optional filter that will exclude a node if:
1. Its name does not match the filter; And
2. It is not connected to any nodes that match the filter.

The complexity here is O(N + V * E) because for each vertex (V) we have to walk all edges (E) that eventually connect to it.
*/
export function transformToSankeyGraph(
  deps: Deps,
  filter?: string
): { graph: SankeyDiagram; entries: NodeLookupTableEntry[] } {
  const lookup: NodeLookupTable = {};

  Object.entries(deps).forEach(([name, projects]) => {
    const curr = createOrGet(name, lookup);
    projects.forEach(({ projectName }) => {
      const source = createOrGet(projectName, lookup);
      source.targets.push(curr);
      curr.sources.push(source);
    });
  });

  const entries = Object.values(lookup);

  if (filter) {
    // From each node that matches filter, walk all links and mark connected nodes as included.
    entries.forEach(entry => {
      if (entry.name.indexOf(filter) > -1) {
        markEntryInclusion(entry, true);
      } else if (!entry.isVisited) {
        entry.isIncluded = false;
      }
    });
  }

  const graph = { nodes: [] as any[], links: [] as any[] };
  const indices = {} as any;
  const includedEntries = entries.filter(entry => entry.isIncluded);

  includedEntries.forEach((entry, idx) => (indices[entry.name] = idx));
  includedEntries.forEach((entry, idx) => {
    graph.nodes.push({ name: entry.name });

    entry.sources.forEach((source: any) => {
      graph.links.push({
        source: idx,
        target: indices[source.name],
        value: 1
      });
    });
  });

  return {
    entries: includedEntries,
    graph
  };
}

function createOrGet(name: string, lookup: NodeLookupTable) {
  let entry = lookup[name];
  if (!entry) {
    entry = {
      name,
      sources: [],
      targets: [],
      isIncluded: true,
      isVisited: false
    };
    lookup[name] = entry;
  }
  return entry;
}

function markEntryInclusion(entry: NodeLookupTableEntry, followTargets?: boolean) {
  if (entry.isVisited) {
    return;
  }
  entry.isIncluded = true;
  entry.isVisited = true;
  entry.sources.forEach(x => markEntryInclusion(x, false));
  if (followTargets) {
    entry.targets.forEach(x => markEntryInclusion(x, true));
  }
}
