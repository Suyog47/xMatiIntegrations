const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

async function downloadCSV(data, email, res) {
    try {
        if (!Array.isArray(data)) {
            return false;
        }

        const fields = Object.keys(data[0])
        const parser = new Parser({ fields })
        const csv = parser.parse(data)

        // Save file temporarily
        // eslint-disable-next-line no-undef
        const filePath = path.join(__dirname, `${email}-data.csv`);
        fs.writeFileSync(filePath, csv);

        // Use res.download to trigger download
        res.download(filePath, `${email}-data.csv`, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).send('Download failed');
            }

            // delete file after sending
            fs.unlinkSync(filePath);
        });
        return true;
    }
    catch (error) {
        console.error("Error in downloadCSV:", error);
        return false;
    }
}

module.exports = { downloadCSV };