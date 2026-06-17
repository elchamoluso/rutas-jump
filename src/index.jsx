import { createRoot } from 'react-dom/client';
import App from './App';

const DATA = (typeof window !== 'undefined' && window.DATA) || {
  brand: { title: 'Rutas' },
  sections: [],
  aliasByPath: {},
  favorites: [],
  commands: { categories: [] },
  stats: {},
};

createRoot(document.getElementById('root')).render(<App data={DATA} />);
