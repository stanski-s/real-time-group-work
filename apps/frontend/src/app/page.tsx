import { Metadata } from 'next';
import IndexComponent from './IndexComponent';

export const metadata: Metadata = {
  title: 'TypeSpace - Twój zespół w czasie rzeczywistym',
  description: 'TypeSpace to nowoczesna platforma komunikacyjna dla Twojego zespołu. Rozmawiaj na kanałach tematycznych, twórz workspaces i utrzymuj stały kontakt ze znajomymi.',
};

export default function IndexPage() {
  return <IndexComponent />;
}
