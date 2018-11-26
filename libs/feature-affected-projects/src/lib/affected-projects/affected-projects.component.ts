import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs/operators';
import { SankeyDiagramComponent } from '../sankey-diagram/sankey-diagram.component';
import { DepGraph } from '../util';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';

import { GIT_POLLING, DEP_GRAPH_POLLING } from '@angular-console/utils';
import { ContextualActionBarService } from '@nrwl/angular-console-enterprise-frontend';

const DepGraphQuery = gql`
  query DepGraph($path: String!, $base: String!, $head: String) {
    workspace(path: $path) {
      depGraph(base: $base, head: $head) {
        json
      }
    }
  }
`;

const GitBranchesQuery = gql`
  query GitBranches($path: String!) {
    workspace(path: $path) {
      gitBranches
    }
  }
`;

interface DepGraphResult {
  workspace: {
    depGraph: {
      json: string;
    };
  };
}

@Component({
  selector: 'angular-console-affected-projects',
  templateUrl: './affected-projects.component.html',
  styleUrls: ['./affected-projects.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AffectedProjectsComponent implements OnDestroy {
  @ViewChild(SankeyDiagramComponent)
  private readonly diagram: SankeyDiagramComponent;

  private initialFilter = this.route.snapshot.queryParams.filter || '';

  branchCtrl = new FormControl('master');

  filterCtrl = new FormControl(this.initialFilter);

  pendingRequest$ = new BehaviorSubject(true);

  project$: Observable<null | string> = this.route.params.pipe(
    map(m => m.project)
  );

  depGraph$: Observable<null | DepGraph> = combineLatest(
    this.route.params.pipe(map(m => m.path)),
    this.branchCtrl.valueChanges.pipe(startWith('master'))
  ).pipe(
    distinctUntilChanged(allValuesEqual),
    tap(() => this.pendingRequest$.next(true)),
    switchMap(
      ([path, base]) =>
        this.apollo.watchQuery<DepGraphResult>({
          query: DepGraphQuery,
          variables: {
            path,
            base
          },
          pollInterval: DEP_GRAPH_POLLING
        }).valueChanges
    ),
    shareReplay(1),
    tap(() => this.pendingRequest$.next(false)),
    map(({ data }) => (data ? JSON.parse(data.workspace.depGraph.json) : null))
  );

  projectNames$: Observable<string[]> = this.depGraph$.pipe(
    map(data => (data ? Object.keys(data.projectTypes) : []))
  );

  gitBranches$ = this.route.params.pipe(
    map(m => m.path),
    switchMap(
      path =>
        this.apollo.watchQuery<{
          workspace: { gitBranches: string[] };
        }>({
          query: GitBranchesQuery,
          variables: {
            path
          },
          pollInterval: GIT_POLLING
        }).valueChanges
    ),
    map(({ data }) => (data ? data.workspace.gitBranches : []))
  );

  filterValue$ = this.filterCtrl.valueChanges.pipe(
    tap(value =>
      this.router.navigate(['.'], {
        relativeTo: this.route,
        queryParams: value ? { filter: value } : {}
      })
    )
  );

  filteredProjects$ = combineLatest(
    this.projectNames$,
    this.filterValue$.pipe(startWith(this.initialFilter))
  ).pipe(
    map(([names, value]) =>
      names.filter(name => name.indexOf(value) > -1).sort()
    )
  );

  filterChangeSubscription = this.route.queryParams
    .pipe(map(m => m.filter))
    .subscribe(value => {
      this.filterCtrl.setValue(value);
    });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly apollo: Apollo
  ) {}

  ngOnDestroy() {
    this.filterChangeSubscription.unsubscribe();
  }

  onNodeSelected({ node, isDblClick }: any) {
    const { params } = this.route.snapshot;
    let { queryParams } = this.route.snapshot;
    if (isDblClick) {
      queryParams = {
        filter: node.name
      };
    }
    if (params.project === node.name) {
      this.router.navigate(['/workspace', params.path, 'affected-projects'], {
        queryParams,
        replaceUrl: true
      });
    } else {
      this.router.navigate(
        ['/workspace', params.path, 'affected-projects', node.name],
        { queryParams, replaceUrl: true }
      );
    }
  }

  testAffected() {
    this.router
      .navigate([
        '/workspace',
        this.route.snapshot.params.path,
        'tasks',
        'script',
        'affected:test'
      ])
      .catch(e => console.error(e));
  }

  testSelected() {
    this.router
      .navigate([
        '/workspace',
        this.route.snapshot.params.path,
        'tasks',
        'test',
        this.route.snapshot.params.project
      ])
      .catch(e => console.error(e));
  }
}

function allValuesEqual(aryA: string[], aryB: string[]) {
  return aryA.every((val, i) => val === aryB[i]);
}
