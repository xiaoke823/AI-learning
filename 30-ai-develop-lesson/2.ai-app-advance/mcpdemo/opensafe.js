
import { exec } from 'child_process';
const path = 'C:/Users/Administrator/AppData/Local/Postman/Postman.exe'
exec(`start "" "${path}"`, (error) => {
    if (error) {
        console.error('启动失败，请确认路径是否正确');
    } else {
        console.log('Postman启动成功！');
    }
});
