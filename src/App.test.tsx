import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the initial screen without loading the model', () => {
    render(<App />);

    expect(screen.getByText('Contador de personas y autos')).toBeInTheDocument();
    expect(screen.getByText('Iniciar conteo')).toBeInTheDocument();
  });

  it('renders line orientation controls', () => {
    render(<App />);

    expect(screen.getByText('Linea horizontal')).toBeInTheDocument();
    expect(screen.getByText('Linea vertical')).toBeInTheDocument();
  });
});
