import { ContentCatalog } from '@/components/content-catalog';
import { withPremiumAccess } from '@/components/premium-access';
function MentorshipsScreen() { return <ContentCatalog kind="mentoria" />; }
export default withPremiumAccess(MentorshipsScreen, 'media', '/');
