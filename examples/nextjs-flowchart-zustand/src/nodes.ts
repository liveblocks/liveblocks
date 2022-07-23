import { Node } from 'react-flow-renderer';

export default [
  {
    id: '1',
    type: 'input',
    data: { label: 'Input' },
    position: { x: 250, y: 25 },
  },

  {
    id: '2',
    data: { label: 'Default' },
    position: { x: 100, y: 125 },
  },
  {
    id: '3',
    type: 'output',
    data: { label: 'Output' },
    position: { x: 250, y: 250 },
  },
] as Node[];
