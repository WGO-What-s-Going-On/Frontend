// 프로필 이미지. 등록한 사진이 없으면 서비스 기본 프로필 이미지(닉네임 첫 글자)를 쓴다 (USR-F06)
export function Avatar({ src, name, size = 52 }: { src?: string; name: string; size?: number }) {
  return src
    ? <img className="avatar" src={src} alt={`${name} 프로필 사진`} style={{ width: size, height: size }}/>
    : <span className="avatar avatar-default" style={{ width: size, height: size, fontSize: size * .4 }} aria-label={`${name} 기본 프로필`}>{name.slice(0, 1)}</span>
}
