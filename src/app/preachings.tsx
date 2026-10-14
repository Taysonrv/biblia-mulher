import { ContentCatalog } from '@/components/content-catalog';
import { withPremiumAccess } from '@/components/premium-access';
function PreachingsScreen() { return <ContentCatalog kind="pregacao" />; }
export default withPremiumAccess(PreachingsScreen, 'media', '/');
