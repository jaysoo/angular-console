import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { select } from 'd3-selection';
import { transformToSankeyGraph } from '../util';

const MIN_WIDTH = 700;
const MAX_HEIGHT = 1000;
const ESIMATED_NODE_HEIGHT = 100;

interface UpdateState {
  linkContainer: any;
  nodeContainer: any;
  graph: any;
  width: number;
}

interface SankeyUtil {
  getNodeFillColor: Function;
  getNodeStrokeColor: Function;
  getLinkColor: Function;
  getNodeTextOpacity: Function;
  getNodeTextColor: Function;
  onNodeClick: Function;
  onNodeDblClick: Function;
}

@Component({
  selector: 'angular-console-sankey-diagram',
  templateUrl: './sankey-diagram.component.html',
  styleUrls: ['./sankey-diagram.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SankeyDiagramComponent implements OnInit, OnChanges {
  svg: any;
  sankey: any;
  linkContainer: any;
  nodeContainer: any;
  g: any;
  x: any;
  y: any;

  width = MIN_WIDTH;

  private _sankeyData: any = { links: [], nodes: [] };
  private _data: any;
  private _filter: string;
  private _numLeafDependencies: number;

  @Input()
  set data(data: any) {
    this._data = data;
    this.updateGraphData();
  }
  @Input()
  set filter(filter: string) {
    this._filter = filter;
    this.updateGraphData();
  }

  @Input() selected: string;

  @Output() readonly nodeSelected = new EventEmitter<any>();

  @ViewChild('svg') private readonly svgEl: ElementRef;
  @ViewChild('container') private readonly container: ElementRef;

  ngOnInit() {
    this.updateDimensions();
    this.updateSelected();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const hasFilterChanged = !!changes.filter;
    const hasDataChanged =
      !!changes.data &&
      !!changes.data.previousValue &&
      changes.data.currentValue !== changes.data.previousValue;
    if (hasFilterChanged || hasDataChanged) {
      this.updateDimensions();
    }
    this.updateSelected();
  }

  updateDimensions() {
    this.reset();

    const height = Math.min(
      MAX_HEIGHT,
      this._numLeafDependencies * ESIMATED_NODE_HEIGHT
    );
    this.width = Math.max(MIN_WIDTH, this.container.nativeElement.offsetWidth);
    this.svg.attr('width', this.width).attr('height', height);
    this.sankey = sankey()
      .nodeWidth(20)
      .nodePadding(10)
      .extent([[1, 1], [this.width - 1, height - 1]]);

    this.render();
  }

  reset() {
    this.svg = select(this.svgEl.nativeElement);

    this.sankey = sankey()
      .nodeWidth(20)
      .nodePadding(10);

    // Remove any previous links and nodes containers.
    this.svg.select('.links').remove();
    this.svg.select('.nodes').remove();

    this.linkContainer = this.svg
      .append('g')
      .attr('class', 'links')
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('stroke-opacity', 0.2);

    this.nodeContainer = this.svg
      .append('g')
      .attr('class', 'nodes')
      .attr('font-family', 'Roboto')
      .attr('font-size', 14);
  }

  render() {
    if (!this.sankey || !this._sankeyData) {
      return;
    }
    this.sankey.nodes(this._sankeyData.nodes);
    this.sankey.links(this._sankeyData.links);

    updateSankey(
      {
        graph: this.sankey(),
        linkContainer: this.linkContainer,
        nodeContainer: this.nodeContainer,
        width: this.width
      },
      {
        getNodeFillColor: (nodeId: string) =>
          this.getColorByProjectType(nodeId),
        getLinkColor: (nodeId: string) =>
          this.isInCriticalPath(nodeId) ? '#950000' : '#777',
        getNodeStrokeColor: (nodeId: string) =>
          this.isInCriticalPath(nodeId) ? '#950000' : '#333',
        getNodeTextColor: (nodeId: string) =>
          this.isInCriticalPath(nodeId) ? '#000' : '#333',
        onNodeClick: this.onNodeClick,
        onNodeDblClick: this.onNodeDblClick,
        getNodeTextOpacity: (nodeId: string) =>
          this.isInCriticalPath(nodeId) ? 1 : 0.6
      }
    );
  }

  onNodeClick = (node: any) => {
    this.nodeSelected.emit({ node, isDblClick: false });
  };

  onNodeDblClick = (node: any) => {
    this.nodeSelected.emit({ node, isDblClick: true });
  };

  private updateGraphData() {
    if (this._data) {
      const { graph, entries } = transformToSankeyGraph(
        this._data.deps,
        this._filter
      );
      this._numLeafDependencies = entries.filter(
        x => x.sources.length === 0
      ).length;
      this._sankeyData = graph;
    }
  }

  private updateSelected() {
    if (this.sankey) {
      const graph = this.sankey();
      const node = graph.nodes.find((n: any) => n.name === this.selected);
      this.selectNode(node);
    }
  }

  private selectNode(node: any) {
    this.deselectAll();
    if (node) {
      this.selectNodeAndItsDeps(node);
    }
  }

  private selectNodeAndItsDeps(node: any) {
    const traverse = [
      {
        linkType: 'sourceLinks',
        nodeType: 'target'
      },
      {
        linkType: 'targetLinks',
        nodeType: 'source'
      }
    ];

    let remainingNodes = [] as any[];
    let nextNodes = [] as any[];

    highlightNode(node, 1, '#009511');

    traverse.forEach(step => {
      node[step.linkType].forEach((link: any) => {
        remainingNodes.push(link[step.nodeType]);
        highlightLink(link, 0.6);
      });

      while (remainingNodes.length) {
        nextNodes = [];
        remainingNodes.forEach(n => {
          n[step.linkType].forEach((link: any) => {
            nextNodes.push(link[step.nodeType]);
            highlightLink(link, 0.6);
          });
        });
        remainingNodes = nextNodes;
      }
    });
  }

  private deselectAll() {
    this._sankeyData.links.forEach((link: any) => highlightLink(link, 0.2));
    this._sankeyData.nodes.forEach((node: any) => highlightNode(node, 0.5));
  }

  private getColorByProjectType(nodeId: string) {
    const type = this._data.projectTypes[nodeId];
    switch (type) {
      case 'application':
        return '#5788e9';
      case 'library':
        return '#ffcf8d';
      default:
        return '#6c6c6c';
    }
  }

  private isInCriticalPath(nodeId: string) {
    return this._data.criticalPath.indexOf(nodeId) > -1;
  }
}

function updateSankey(
  { linkContainer, nodeContainer, graph, width }: UpdateState,
  util: SankeyUtil
) {
  updateNodes(nodeContainer, graph.nodes, width, util);
  updateLinks(linkContainer, graph.links, util);
}

function updateLinks(
  linkContainer: any,
  linkData: any,
  { getLinkColor }: SankeyUtil
) {
  // Join new data with old elements
  const links = linkContainer
    .selectAll('.link')
    .data(linkData, (d: any) => `${d.source}${d.target}`);

  // Remove elements not present in new data
  links.exit().remove();

  // Update old elements
  links.attr('d', sankeyLinkHorizontal());

  // Enter new elements
  const enteringLinks = links
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('id', makeLinkId)
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke', (d: any) => getLinkColor(d.target.name))
    .attr('stroke-width', (d: any) => Math.max(1, d.width));

  // Add the link titles
  enteringLinks
    .append('title')
    .text((d: any) => `${d.source.name} → ${d.target.name}`);
}

function updateNodes(
  nodeContainer: any,
  nodeData: any,
  width: number,
  {
    onNodeClick,
    onNodeDblClick,
    getNodeStrokeColor,
    getNodeFillColor,
    getNodeTextColor,
    getNodeTextOpacity
  }: SankeyUtil
) {
  // Join new data with old elements
  const nodes = nodeContainer
    .selectAll('.node')
    .data(nodeData, (d: any) => d.id);

  // Remove elements not present in new data
  nodes.exit().remove();

  // Enter new elements
  const enteringNodes = nodes
    .enter()
    .append('g')
    .attr('class', 'node');

  // Add the rectangles for the nodes
  enteringNodes
    .append('rect')
    .attr('x', (d: any) => d.x0)
    .attr('y', (d: any) => d.y0)
    .attr('height', (d: any) => d.y1 - d.y0)
    .attr('width', (d: any) => d.x1 - d.x0)
    .attr('id', makeNodeId)
    .attr('stroke', (d: any) => getNodeStrokeColor(d.name))
    .attr('fill', (d: any) => getNodeFillColor(d.name))
    .on('dblclick', (d: any) => onNodeDblClick(d))
    .on('click', (d: any) => onNodeClick(d))
    .append('title')
    .text((d: any) => d.name);

  // Add node names
  enteringNodes
    .append('text')
    .attr('opacity', (d: any) => getNodeTextOpacity(d.name))
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('x', (d: any) => d.x0 - 6)
    .attr('y', (d: any) => (d.y1 + d.y0) / 2)
    .attr('fill', (d: any) => getNodeTextColor(d.name))
    .text((d: any) => d.name)
    .filter((d: any) => d.x0 <= 1)
    .attr('x', (d: any) => d.x1 + 6)
    .attr('text-anchor', 'start');
}

function highlightLink(d: any, opacity: number): void {
  select(`#${makeLinkId(d)}`).style('stroke-opacity', opacity);
}

function highlightNode(d: any, opacity: number, color?: string): void {
  const el = select(`#${makeNodeId(d)}`);
  el.style('fill-opacity', opacity).style('stroke-opacity', opacity);
  if (color) {
    el.style('fill', color);
  } else {
    el.style('fill', '');
  }
}

function makeLinkId(link: any) {
  return `links-${link.source.name}-${link.target.name}`;
}

function makeNodeId(node: any) {
  return `nodes-${node.name}`;
}
