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

export function transformToSankeyGraph(deps: Deps, filter?: string): SankeyDiagram {
  const graph = { nodes: [] as any[], links: [] as any[] };
  const entriesArray: any[] = Object.entries(deps);
  const indices = {} as any;

  entriesArray.forEach((value, i) => (indices[value[0]] = i));
  entriesArray.forEach((project, i) => {
    graph.nodes.push({ name: project[0] });

    project[1].forEach((dep: any) => {
      graph.links.push({
        source: i,
        target: indices[dep.projectName],
        value: 1
      });
    });
  });

  return graph;
}
