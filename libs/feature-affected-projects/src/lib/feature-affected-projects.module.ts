import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '@angular-console/ui';
import { AffectedProjectsComponent } from './affected-projects/affected-projects.component';
import { SankeyDiagramComponent } from './sankey-diagram/sankey-diagram.component';
import { Route, RouterModule } from '@angular/router';

export const affectedProjectsRoutes: Route[] = [
  {
    path: '',
    component: AffectedProjectsComponent
  },
  {
    path: ':project',
    component: AffectedProjectsComponent
  }
];

@NgModule({
  imports: [CommonModule, RouterModule, UiModule],
  declarations: [AffectedProjectsComponent, SankeyDiagramComponent]
})
export class FeatureAffectedProjectsModule {}
