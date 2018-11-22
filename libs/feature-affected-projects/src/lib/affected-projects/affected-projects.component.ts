import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';
import { SankeyDiagramComponent } from '../sankey-diagram/sankey-diagram.component';
import { DepGraph } from '../util';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';

const DEP_GRAPH_POLLING = 10 * 1000;

const DepGraphQuery = gql`
  query DepGraph($path: String!, $base: String!, $head: String) {
    workspace(path: $path) {
      depGraph(base: $base, head: $head) {
        json
      }
    }
  }
`;

@Component({
  selector: 'angular-console-affected-projects',
  templateUrl: './affected-projects.component.html',
  styleUrls: ['./affected-projects.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AffectedProjectsComponent {
  @ViewChild(SankeyDiagramComponent) diagram: SankeyDiagramComponent;

  projectCtrl = new FormControl();

  depGraph$: Observable<null | DepGraph> = this.route.params.pipe(
    map(m => m.path),
    switchMap(
      path =>
        this.apollo.watchQuery<{
          workspace: { depGraph: { json: string } };
        }>({
          query: DepGraphQuery,
          variables: {
            path,
            base: 'master'
          },
          fetchPolicy: 'cache-and-network',
          pollInterval: DEP_GRAPH_POLLING
        }).valueChanges
    ),
    map(({ data }) => (data ? JSON.parse(data.workspace.depGraph.json) : null))
  );

  project$: Observable<null | string> = this.route.params.pipe(
    map(m => m.project)
  );

  projectNames$: Observable<string[]> = this.depGraph$.pipe(
    map(data => (data ? Object.keys(data.projectTypes) : []))
  );

  projectFilter$ = this.projectCtrl.valueChanges.pipe(startWith(''));

  filteredOptions$ = combineLatest(
    this.projectNames$,
    this.projectFilter$
  ).pipe(
    map(([names, value]) => names.filter(name => name.indexOf(value) > -1))
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly apollo: Apollo
  ) {}

  onNodeSelected(node: any) {
    const { params } = this.route.snapshot;
    if (params.project === node.name) {
      this.router.navigate(['/workspace', params.path, 'affected-projects'], {
        replaceUrl: true
      });
    } else {
      this.router.navigate(
        ['/workspace', params.path, 'affected-projects', node.name],
        { replaceUrl: true }
      );
    }
  }

  testAffected() {}

  testSelected() {}
}
