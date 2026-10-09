import { useLanguage } from './i18n/react';
import { avatarById, backgroundById, type AvatarProfile } from './avatars';
export function Avatar({ profile, size = 40, decorative = false }: { profile: AvatarProfile; size?: number; decorative?: boolean }) {
  const { t } = useLanguage();
  const avatar = avatarById(profile.avatarId);
  return <span className="avatar-image" style={{ width: size, height: size, backgroundColor: backgroundById(profile.backgroundId).color }}>
    <img src={`${import.meta.env.BASE_URL}avatars/${avatar.id}.svg`} width={size} height={size} alt={decorative ? '' : `${avatar.name}: ${t(avatar.description)}`} draggable={false}/>
  </span>;
}
