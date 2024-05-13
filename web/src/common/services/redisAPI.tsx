import { AxiosError } from 'axios';
import * as redisAxios from '@utils/redis';

interface RedisSubscribe {
  channel: string; // 받는 사람 email
}

interface RedisPublish extends RedisSubscribe {
  message: string; // 남들에게 보여줄 메세지
}

export async function MessagePost({ channel, message }: RedisPublish) {
  try {
    const res = await redisAxios.post('/publish', {
      channel,
      message,
    });
    if (!res) throw new Error('Redis 메세지 전송 실패');
    console.log(`Redis 메세지 전송 성공 :`, res);

    return true;
  } catch (e) {
    const err = e as AxiosError;

    console.error('Redis 메세지 전송 에러', err);
  }
}

export async function Connect(useremail: string) {
  try {
    const res = await redisAxios.get(`/subscribe/${useremail}`);
    if (!res) throw new Error('Redis 구독 실패');
    console.log(`Redis 구독 성공 :`, res);

    return true;
  } catch (e) {
    const err = e as AxiosError;

    console.error('Redis 구독 에러', err);
  }
}

export async function Unconnect(channel: RedisSubscribe) {
  try {
    await redisAxios.get(`/unsubscribe/${channel}`);

    return true;
  } catch (e) {
    const err = e as AxiosError;

    console.error('Redis 구독 취소 에러', err);
  }
}

// const handleSet = async () => {
//   try {
//     const response = await axios.post('/set', {
//       key,
//       value,
//       ttl: parseInt(ttl, 10),
//     });
//     setResult(`Key ${key} set with value ${value}`);
//   } catch (error) {
//     setResult(`Error: ${(error as AxiosError).response?.data}`); // 수정
//   }
// };

// const handleGet = async () => {
//   try {
//     const response = await axios.get(`/get/${key}`);
//     setResult(`Value for key ${key}: ${response.data}`);
//   } catch (error) {
//     setResult(`Error: ${(error as AxiosError).response?.data}`); // 수정
//   }
// };