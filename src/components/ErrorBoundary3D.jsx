import { Component } from 'react';

// Envuelve la escena 3D (decorativa) para que un error de render no tire toda la página.
export default class ErrorBoundary3D extends Component {
  constructor(props) {
    super(props);
    this.state = { fallo: false };
  }
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  componentDidCatch(error) {
    // No inundamos la consola en producción; el componente simplemente desaparece.
    if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
      console.warn('Obra3D: escena omitida por error de render.', error?.message);
    }
  }
  render() {
    if (this.state.fallo) return null;
    return this.props.children;
  }
}