export interface BtsMemberProfile {
  id: string;
  label: string;
  searchTerms: string[];
  aliases: string[];
}

export const btsMemberProfiles: BtsMemberProfile[] = [
  { id: 'rm', label: 'RM', searchTerms: ['BTS RM', 'Kim Namjoon BTS', 'RM Bangtan'], aliases: ['kim namjoon', 'namjoon', 'rap monster'] },
  { id: 'jin', label: 'Jin', searchTerms: ['BTS Jin', 'Kim Seokjin BTS', 'Seokjin Bangtan'], aliases: ['kim seokjin', 'seokjin', 'world wide handsome'] },
  { id: 'suga', label: 'SUGA', searchTerms: ['BTS SUGA', 'Min Yoongi BTS', 'Agust D BTS'], aliases: ['min yoongi', 'yoongi', 'agust d', 'min suga'] },
  { id: 'j-hope', label: 'j-hope', searchTerms: ['BTS j-hope', 'Jung Hoseok BTS', 'Hoseok Bangtan'], aliases: ['jung hoseok', 'jung hoseok of bts', 'hoseok', 'j-hope', 'jhope'] },
  { id: 'jimin', label: 'Jimin', searchTerms: ['BTS Jimin', 'Park Jimin BTS', 'Jimin Bangtan'], aliases: ['park jimin', 'park jimin of bts', 'jimin'] },
  { id: 'v', label: 'V', searchTerms: ['BTS V', 'Kim Taehyung BTS', 'Taehyung Bangtan'], aliases: ['kim taehyung', 'kim tae hyung', 'taehyung', 'v of bts'] },
  { id: 'jungkook', label: 'Jung Kook', searchTerms: ['BTS Jungkook', 'Jeon Jungkook BTS', 'Jungkook Bangtan'], aliases: ['jeon jungkook', 'jungkook', 'jung kook', 'jeon jungkook of bts'] },
];

export const btsGroupSearchTerms = ['BTS group', 'BTS members', '방탄소년단 BTS', 'BTS OT7'];
