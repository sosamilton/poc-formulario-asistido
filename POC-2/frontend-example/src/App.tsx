import { FormRenderer } from './FormRenderer';
import './App.css';

function App() {
  const windmillUrl = import.meta.env.VITE_WINDMILL_URL || 'http://localhost:8000';
  const windmillToken = import.meta.env.VITE_WINDMILL_TOKEN || '';

  return (
    <div className="App">
      <header>
        <h1>Declaración Jurada IIBB</h1>
        <p>Complete el formulario de declaración jurada de ingresos brutos</p>
      </header>
      
      <main>
        <FormRenderer
          slug="ddjj-iibb"
          windmillUrl={windmillUrl}
          windmillToken={windmillToken}
          userId="test-user"
        />
      </main>
    </div>
  );
}

export default App;
