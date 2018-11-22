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

@Component({
  selector: 'angular-console-sankey-diagram',
  templateUrl: './sankey-diagram.component.html',
  styleUrls: ['./sankey-diagram.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SankeyDiagramComponent implements OnInit, OnChanges {
  sankey: any;
  svg: any;
  linkContainer: any;
  nodeContainer: any;
  g: any;
  x: any;
  y: any;

  height = 600;
  width = 600;

  private _sankeyData: any = { links: [], nodes: [] };
  private _data: any;

  @Input()
  set data(data: any) {
    this._data = data;
    this._sankeyData = transformToSankeyGraph(data.deps, this.filter);
  }

  @Input() selected: string;
  @Input() filter: string;

  @Output() readonly nodeSelected = new EventEmitter<any>();

  @ViewChild('svg') private svgEl: ElementRef;
  @ViewChild('container') private container: ElementRef;

  ngOnInit() {
    this.svg = select(this.svgEl.nativeElement);

    this.sankey = sankey()
      .nodeWidth(15)
      .nodePadding(4)
      .extent([[1, 1], [this.width - 1, this.height - 2]]);

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

    this.updateDimensions();
    this.render();
    this.updateSelected();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.data && changes.data.currentValue !== changes.data.previousValue) {
      if (changes.data.previousValue) {
        this.render();
      }
    }
    this.updateSelected();
  }

  updateDimensions() {
    this.width = this.container.nativeElement.offsetWidth;
    this.svg.attr('width', this.width).attr('height', this.height);
    this.sankey = sankey()
      .nodeWidth(15)
      .nodePadding(4)
      .extent([[1, 1], [this.width - 1, this.height - 2]]);
  }

  render() {
    this.sankey.nodes(this._sankeyData.nodes);
    this.sankey.links(this._sankeyData.links);
    updateSankey(
      {
        graph: this.sankey(),
        links: this.linkContainer,
        nodes: this.nodeContainer,
        width: this.width,
        height: this.height
      },
      {
        getNodeFillColor: (nodeId: string) =>
          this.getColorByProjectType(nodeId),
        getLinkColor: (nodeId: string) =>
          this.isInCriticalPath(nodeId)
            ? this.getColorByProjectType(nodeId)
            : '#777',
        getNodeStrokeColor: (nodeId: string) =>
          this.isInCriticalPath(nodeId) ? '#950000' : '#333',
        onNodeClick: this.onNodeClick,
        getNodeTextOpacity: (nodeId: string) =>
          this.isInCriticalPath(nodeId) ? 1 : 0.6
      }
    );
  }

  getColorByProjectType(nodeId: string) {
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

  isInCriticalPath(nodeId: string) {
    return this._data.criticalPath.indexOf(nodeId) > -1;
  }

  onNodeClick = (node: any) => {
    this.nodeSelected.emit(node);
  };

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

    highlightNode(node, 1, '#950000');

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
}

interface SankeyState {
  links: any;
  nodes: any;
  graph: any;
  width: number;
  height: number;
}

interface SankeyUtil {
  getNodeFillColor: Function;
  getNodeStrokeColor: Function;
  getLinkColor: Function;
  getNodeTextOpacity: Function;
  onNodeClick: Function;
}

function updateSankey(
  { links, nodes, graph, width, height }: SankeyState,
  {
    getNodeFillColor,
    getNodeStrokeColor,
    getLinkColor,
    getNodeTextOpacity,
    onNodeClick
  }: SankeyUtil
) {
  const link = links
    .selectAll('path')
    .data(graph.links)
    .enter();

  link
    .append('path')
    .attr('d', sankeyLinkHorizontal())
    .attr('id', (d: any) => `links-${d.source.name}-${d.target.name}`)
    .attr('class', 'link')
    .attr('stroke', (d: any) => getLinkColor(d.target.name))
    .attr('stroke-width', (d: any) => Math.max(1, d.width))
    .exit()
    .remove()
    .append('title')
    .text((d: any) => d.source.name + ' → ' + d.target.name + '\n');

  const node = nodes.selectAll('g').data(graph.nodes, (d: any) => d.name);
  const nodeEnter = node.enter().append('g');

  nodeEnter
    .append('rect')
    .attr('x', (d: any) => d.x0)
    .attr('y', (d: any) => d.y0)
    .attr('height', (d: any) => d.y1 - d.y0)
    .attr('width', (d: any) => d.x1 - d.x0)
    .attr('id', (d: any) => `nodes-${d.name}`)
    .attr('class', 'node')
    .attr('stroke', (d: any) => getNodeStrokeColor(d.name))
    .attr('fill', (d: any) => getNodeFillColor(d.name))
    .on('click', (d: any) => onNodeClick(d));

  node
    .select('rect')
    .attr('y', (d: any) => d.y0)
    .attr('height', (d: any) => d.y1 - d.y0);

  nodeEnter
    .append('text')
    .attr('opacity', (d: any) => getNodeTextOpacity(d.name))
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('x', (d: any) => d.x0 - 6)
    .attr('y', (d: any) => (d.y1 + d.y0) / 2)
    .style('fill', (d: any) => getNodeStrokeColor(d.name))
    .text((d: any) => d.name)
    .filter((d: any) => d.x0 < width / 2)
    .attr('x', (d: any) => d.x1 + 6)
    .attr('text-anchor', 'start');

  node
    .select('text')
    .attr('y', (d: any) => (d.y1 + d.y0) / 2)
    .filter((d: any) => d.x0 < width / 2)
    .attr('text-anchor', 'start');

  nodeEnter.append('title').text((d: any) => d.name);

  node.exit().remove();
}

function highlightLink(d: any, opacity: number): void {
  select(`#links-${d.source.name}-${d.target.name}`).style(
    'stroke-opacity',
    opacity
  );
}

function highlightNode(d: any, opacity: number, color?: string): void {
  const el = select(`#nodes-${d.name}`);
  el.style('fill-opacity', opacity).style('stroke-opacity', opacity);
  if (color) {
    el.style('fill', color);
  } else {
    el.style('fill', '');
  }
}
