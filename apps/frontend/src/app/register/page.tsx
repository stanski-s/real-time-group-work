import { Metadata } from 'next';
import RegisterComponent from './RegisterComponent';

export const metadata: Metadata = {
  title: 'Rejestracja konta | TypeSpace',
  description: 'Utwórz bezpłatne konto na platformie komunikacyjnej TypeSpace i zacznij rozmawiać ze swoim zespołem w czasie rzeczywistym.',
};

export default function RegisterPage() {
  return <RegisterComponent />;
}
