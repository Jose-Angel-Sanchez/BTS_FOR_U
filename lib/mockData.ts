export type MediaType = 'image' | 'video';

export interface BTSMedia {
  id: string;
  type: MediaType;
  title: string;
  url: string;
  videoId?: string;
  height: number;
}

export const mockFeedData: BTSMedia[] = [
  {
    id: 'yt_dynamite',
    type: 'video',
    title: 'BTS Dynamite',
    url: 'https://img.youtube.com/vi/gdZLi9oWNZg/maxresdefault.jpg',
    videoId: 'gdZLi9oWNZg',
    height: 480,
  },
  {
    id: 'yt_butter',
    type: 'video',
    title: 'BTS Butter',
    url: 'https://img.youtube.com/vi/WMweEpGlu_U/maxresdefault.jpg',
    videoId: 'WMweEpGlu_U',
    height: 480,
  },
  {
    id: 'yt_blood_sweat',
    type: 'video',
    title: 'BTS Blood Sweat and Tears',
    url: 'https://img.youtube.com/vi/hmE9f-TEutc/maxresdefault.jpg',
    videoId: 'hmE9f-TEutc',
    height: 450,
  },
  {
    id: 'yt_bwl',
    type: 'video',
    title: 'BTS Boy With Luv',
    url: 'https://img.youtube.com/vi/XsX3ATc3FbA/maxresdefault.jpg',
    videoId: 'XsX3ATc3FbA',
    height: 500,
  },
  {
    id: 'yt_mic_drop',
    type: 'video',
    title: 'BTS MIC Drop',
    url: 'https://img.youtube.com/vi/kTlv5_Bs8aw/maxresdefault.jpg',
    videoId: 'kTlv5_Bs8aw',
    height: 480,
  },
  {
    id: 'yt_fake_love',
    type: 'video',
    title: 'BTS Fake Love',
    url: 'https://img.youtube.com/vi/7C2z4GqqS5E/maxresdefault.jpg',
    videoId: '7C2z4GqqS5E',
    height: 480,
  },
  {
    id: 'yt_dna',
    type: 'video',
    title: 'BTS DNA',
    url: 'https://img.youtube.com/vi/MBdVXkSdbc8/maxresdefault.jpg',
    videoId: 'MBdVXkSdbc8',
    height: 500,
  },
  {
    id: 'yt_on',
    type: 'video',
    title: 'BTS ON',
    url: 'https://img.youtube.com/vi/gwMa6gpoE9I/maxresdefault.jpg',
    videoId: 'gwMa6gpoE9I',
    height: 480,
  },
  {
    id: 'yt_idol',
    type: 'video',
    title: 'BTS IDOL',
    url: 'https://img.youtube.com/vi/pBuZEGYXA6E/maxresdefault.jpg',
    videoId: 'pBuZEGYXA6E',
    height: 450,
  },
  {
    id: 'yt_spring_day',
    type: 'video',
    title: 'BTS Spring Day',
    url: 'https://img.youtube.com/vi/xEeFrLSkMm8/maxresdefault.jpg',
    videoId: 'xEeFrLSkMm8',
    height: 480,
  },
  {
    id: 'yt_ptd',
    type: 'video',
    title: 'BTS Permission to Dance',
    url: 'https://img.youtube.com/vi/CuklIb9d3fI/maxresdefault.jpg',
    videoId: 'CuklIb9d3fI',
    height: 480,
  },
  {
    id: 'yt_yet_to_come',
    type: 'video',
    title: 'BTS Yet To Come',
    url: 'https://img.youtube.com/vi/kXpOEzNZ8hQ/maxresdefault.jpg',
    videoId: 'kXpOEzNZ8hQ',
    height: 500,
  },
  {
    id: 'yt_black_swan',
    type: 'video',
    title: 'BTS Black Swan',
    url: 'https://img.youtube.com/vi/0lapF4DQPKM/maxresdefault.jpg',
    videoId: '0lapF4DQPKM',
    height: 460,
  },
];
