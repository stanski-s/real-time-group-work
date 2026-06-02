import { Metadata } from 'next';
import JoinWorkspaceComponent from './JoinWorkspaceComponent';

export const metadata: Metadata = {
  title: 'Dołącz do przestrzeni roboczej | TypeSpace',
  description: 'Zostałeś zaproszony do dołączenia do przestrzeni roboczej na platformie TypeSpace.',
};

export default function JoinWorkspacePage() {
  return <JoinWorkspaceComponent />;
}
