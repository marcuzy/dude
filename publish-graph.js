const plotly = require('plotly')(process.env.PLOTLY_LOGIN, process.env.PLOTLY_API_KEY);
const cloudinary = require('cloudinary');

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * @prop {array} points
 * 
 * @returns {Promise}
 */
function publishGraph(points) {

    return new Promise((resolve, reject) => {
        let x = [],
            y = [];
    
        for (let point of points) {
            x.push(point[0]);
            y.push(point[1]);
        }

        let figure = { 
            'data': [
                {
                    x,
                    y,
                    type: 'scatter'
                }
            ] 
        };

        let imgOpts = {
            format: 'png',
            width: 1000,
            height: 500
        };

        //отправить запрос для построения графика и получить картинку
        plotly.getImage(figure, imgOpts, (error, imageStream) => {

            if (error) {
                console.error(error);
                reject(error);
                return;
            }

            //стрим для загрузки картинки с графом на сервер cloudinary
            let stream = cloudinary.uploader.upload_stream(function(result) { 
                resolve(result.url);
            });

            imageStream.pipe(stream);
        });
    });
}

module.exports = publishGraph;