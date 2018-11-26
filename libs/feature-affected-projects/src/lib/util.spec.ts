import { transformToSankeyGraph } from './util';

describe('transformToSankeyGraph', () => {
  it('converts dep graph data to sankey graph data', () => {
    const expected = {
      nodes: [
        { name: 'example-e2e' },
        { name: 'example' },
        { name: 'libA' },
        { name: 'libB' }
      ],
      links: [
        { source: 0, target: 1, value: 1 },
        { source: 1, target: 2, value: 1 },
        { source: 1, target: 3, value: 1 }
      ]
    };
    const actual = transformToSankeyGraph({
      'example-e2e': [
        {
          projectName: 'example',
          type: 'implicit'
        }
      ],
      example: [
        {
          projectName: 'libA',
          type: 'es6Import'
        },
        {
          projectName: 'libB',
          type: 'es6Import'
        }
      ],
      libA: [],
      libB: []
    });

    expect(actual).toEqual(expected);
  });

  it('filters out projects not connected to matching filter', () => {
    const expected = {
      nodes: [{ name: 'appA' }, { name: 'libA' }, { name: 'libC' }],
      links: [{ source: 0, target: 1, value: 1 }, { source: 1, target: 2, value: 1 }]
    };
    const actual = transformToSankeyGraph(
      {
        appA: [
          {
            projectName: 'libA',
            type: 'es6Import'
          }
        ],
        appB: [
          {
            projectName: 'libB',
            type: 'es6Import'
          }
        ],
        libA: [{ projectName: 'libC', type: 'es6Import' }],
        libB: [],
        libC: []
      },
      'appA'
    );

    expect(actual).toEqual(expected);
  });
});
