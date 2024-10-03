require('dotenv').config();
const MTProto = require('@mtproto/core');
const path = require('path');
const readline = require('readline');

// Достаем данные из переменных окружения
const api_id = process.env.API_ID;
const api_hash = process.env.API_HASH;
const phone_number = process.env.PHONE_NUMBER;

// Инициализация MTProto
const mtproto = new MTProto({
  api_id,
  api_hash,
  storageOptions: {
    path: path.resolve(__dirname, './data/1.json'),
  },
});

// Функция для отправки сообщения в канал или супергруппу
async function sendMessage(chatId, message) {
  try {
    await mtproto.call('messages.sendMessage', {
      peer: { _: 'inputPeerChannel', channel_id: chatId, access_hash: '6889045349601664299' }, // Добавляем access_hash
      message,
      random_id: Math.floor(Math.random() * 0xffffffff),
    });
    console.log(`Сообщение "+" отправлено в чат ${chatId}`);
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
  }
}

// Массив с ID разрешенных групп
const allowedGroups = [-1901933299]; // ID группы

// Обработка ошибок
const getError = (error) => {
  const { error_code, error_message } = error;
  return `${error_code}: ${error_message}`;
};

// Отправка кода для входа
async function sendCode(phone_number) {
  try {
    const result = await mtproto.call('auth.sendCode', {
      phone_number,
      settings: {
        _: 'codeSettings',
      },
    });
    console.log('Код отправлен на номер телефона:', result);
    return result;
  } catch (error) {
    console.error('Ошибка при отправке кода:', getError(error));
  }
}

// Логин с использованием кода из SMS
async function signIn(phone_number, phone_code_hash, code) {
  try {
    const result = await mtproto.call('auth.signIn', {
      phone_number,
      phone_code_hash,
      phone_code: code,
    });
    console.log('Вход выполнен:', result);
    return result;
  } catch (error) {
    console.error('Ошибка при входе:', getError(error));
  }
}

// Логин, если требуется
(async () => {
  const codeResult = await sendCode(phone_number);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Введите код из SMS: ', async (phone_code) => {
    await signIn(phone_number, codeResult.phone_code_hash, phone_code);
    rl.close();
  });
})();

// Отслеживание обновлений и реакция на фото
mtproto.updates.on('updates', (updates) => {
  console.log('Получены обновления:', updates); // Логируем все обновления
  
  updates.updates.forEach((update) => {
    // Логируем каждое сообщение
    console.log('Новое сообщение:', update);

    // Проверяем сообщения из супергрупп или каналов
    if (update._ === 'updateNewChannelMessage' && update.message.media && update.message.media._ === 'messageMediaPhoto') {
      const chatId = update.message.peer_id.channel_id;
      
      // Проверка, является ли канал одним из разрешенных
      if (allowedGroups.includes(-chatId)) { // Отрицательный ID для супергрупп
        sendMessage(chatId, '+');
      }
    }
  });
});
