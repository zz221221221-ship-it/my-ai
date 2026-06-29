const SYSTEM_MESSAGE_PATTERNS = [
  /님이 들어왔습니다/,
  /님이 나갔습니다/,
  /님을 초대했습니다/,
  /님이 .*님을 내보냈습니다/,
  /채팅방 관리자가 메시지를 가렸습니다/,
  /삭제된 메시지입니다/,
  /사진을 보냈습니다/,
  /동영상을 보냈습니다/,
  /이모티콘을 보냈습니다/,
  /파일을 보냈습니다/,
  /보이스톡/,
  /페이스톡/
];

function stripKakaoMetadata(line: string) {
  return line
    .replace(/^\s*-+\s*\d{4}년\s+\d{1,2}월\s+\d{1,2}일.*?-+\s*$/, "")
    .replace(/^\s*\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\..*$/, "")
    .replace(/^\s*\[[^\]]+\]\s*\[(오전|오후)\s*\d{1,2}:\d{2}\]\s*/, "")
    .replace(/^\s*[^:：]{1,24}\s*[:：]\s*/, "")
    .trim();
}

function isSystemMessage(line: string) {
  return SYSTEM_MESSAGE_PATTERNS.some((pattern) => pattern.test(line));
}

// 카카오톡 export txt에서 닉네임, 날짜, 시간, 시스템 메시지를 제거하고 실제 발화만 남긴다.
export function preprocessKakaoTalkText(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => stripKakaoMetadata(line))
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isSystemMessage(line))
    .join("\n");
}
