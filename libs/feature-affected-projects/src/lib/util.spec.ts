import { transformToSankeyGraph } from './util';

describe('transformToSankeyGraph', () => {
  it('converts dep graph data to sankey graph data', () => {
    const expected = {
      nodes: [],
      links: []
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
          projectName: 'my-lib',
          type: 'es6Import'
        },
        {
          projectName: 'hello',
          type: 'es6Import'
        }
      ],
      'my-lib': [],
      hello: []
    });

    expect(actual).toEqual(expected);
  });
});
