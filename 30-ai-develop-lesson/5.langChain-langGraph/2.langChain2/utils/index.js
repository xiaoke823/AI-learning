
import fs from "fs";

export function getUserHistory(userId, seesionId) {
    const userPath = `./chat/${userId}.json`;
    const isExist = fs.existsSync(userPath)

    if (isExist) {
        const userHistory = JSON.parse(fs.readFileSync(userPath).toString());
        const seesionHistory = userHistory[seesionId] || [];
        return seesionHistory;
    } else {
        fs.writeFileSync(userPath, JSON.stringify({
            [seesionId]: []
        }))
        return []
    }
}
export function writeUserHistory(userId, seesionId, history) {
    console.log(userId, seesionId, 'write')
    const userPath = `./chat/${userId}.json`;
    const userHistory = JSON.parse(fs.readFileSync(userPath).toString());
    userHistory[seesionId] = history;
    fs.writeFileSync(userPath, JSON.stringify(userHistory))
}