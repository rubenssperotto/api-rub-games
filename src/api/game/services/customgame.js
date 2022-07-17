'use strict';

const axios = require("axios");
const slugify = require("slugify");
const qs = require('querystring')

function Exception(e) {
    return { e, data: e.data && e.data.errors && e.data.errors };
}

function timeOut(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

//Esta função utiliza o JSDOM para pegar as informações dentro da págia da GOG. Esta função cria uma estrutura da página (emula) e pega os dados necessários
//como por exemplo o rating, short_description e a description. Retorna o rating, a short-description, e a description igual do site da GOG, incluindo as imagens.
async function getGameInfo(slug) {

    try {

        const jsdom = require("jsdom")
        const { JSDOM } = jsdom
        const body = await axios.get(`https://www.gog.com/game/${slug}`)
        const dom = new JSDOM(body.data)

        const description = dom.window.document.querySelector('.description');
        const ratingElement = dom.window.document.querySelector('.age-restrictions__icon use');

        //aqui é utilizado uma regex para eliminar o '#' e o "_" pois o mesmo vem desta forma '#BR_XX'
        return {
            rating: ratingElement
                ? ratingElement
                    .getAttribute("xlink:href")
                    .replace(/_/g, "")
                    .replace(/[^\w-]+/g, "")
                : "BR0",
            short_description: description.textContent.trim().slice(0, 160) + '...',
            description: description.innerHTML,
        };

    } catch (e) {
        console.log("getGameInfo", Exception(e));
    }

}

// getByname --> Se o item a ser adicionado, seja na category ou na publisher por exemplo, for null, 
// retorna true, significa que não existe este item  na lista, logo o mesmo pode ser criado. 
async function getByName(name, entityName) {
    const item = await strapi.db.query(entityName).findOne({
        where: { name: name },
    });
    if (!item) {
        return true
    }
}
// faz o mesmo processo do getByName mas retorna o id para ser utilizado para popular as RELATIONS
async function getID(name, entityName) {
    const item = await strapi.db.query(entityName).findOne({
        where: { name: name },
    });

    return item.id
}
// create --> Se o retorno do getByname for true, então cria o item na lista, se não, não cria. 
// Obs: Atentar-se para o async e await.
// São funções assíncronas que devem esperar uma tarefa ser processada para a próxima ser executada.
// Se existir, não retorna nada pois não queremos um item duplicado.
// recebe como parâmetros name e entityName que vem do "getByName()". Sendo o name o nome que vai estar na entityName. 
// Por exemplo: 'Mohawk Games' é o nome de uma developer logo este nome vai no parâmetro "name", 
// no entityName deve receber 'api::developer.developer' que é a collection type no qual vai ser armazenado este dados.
// Obs: a função create, é utilizada dentro da função "createManyToManyData"
async function create(name, entityName) {
    const item = await getByName(name, entityName)
    if (item === true) {

        await strapi.entityService.create(entityName, {
            data: {
                name: name,
                slug: slugify(name, { lower: true }),
            },
        });
    }
}

// Esta função recebe como parametro um array de "products" do site da GOG, e com isso definimos as propriedades queremos salvar banco de dados.
// Inicializamos um objeto destas propriedades, e em cima dos produtos é feita uma iteração "forEach" em cima das chaves pegando as informações do product.
// Estas informações já estão na API da GOG, como por exemplo "genres" "supportedOperatingSystems" "developers" etc.
// Exemplo, se existe o "genres" é feito uma iteração em cima deles, pois pode ter mais de um gênero, daí é recebido um array com estes dados,
// e salvamos uma chave desse gênero ex: "categories[Action, FPS]", o valor true é somente para ter uma key criada.
// No final, basicamente o que temos são objetos com as chaves que nos interessa.
// Como o "create" é um processo assíncrono e é baseado em promisses, ao invés de termos um await, temos um Promisse.all que pega todas as promisses
// e reseolve todas elas dentro do array que estamos passando, no final ele retorna uma promisse recolvida de tudo isso.
// Finalizando, pegamos cada uma das keys que criamos anteriormente e criamos (create) cada item para a developer, publisher category e platform.
async function createManytoManyData(products) {
    const developers = {}
    const publishers = {}
    const categories = {}
    const platforms = {}

    products.forEach((product) => {
        const { developer, publisher, genres, supportedOperatingSystems } = product

        genres &&
            genres.forEach((item) => {
                categories[item] = true;
            })
        supportedOperatingSystems &&
            supportedOperatingSystems.forEach((item) => {
                platforms[item] = true;
            })
        developers[developer] = true;
        publishers[publisher] = true;
    })
    return Promise.all([
        ...Object.keys(developers).map((name) => create(name, 'api::developer.developer')),
        ...Object.keys(publishers).map((name) => create(name, 'api::publisher.publisher')),
        ...Object.keys(categories).map((name) => create(name, 'api::category.category')),
        ...Object.keys(platforms).map((name) => create(name, 'api::platform.platform')),
    ])
}

// Esta função cria somente os dados da collection type "Games", uma vez que é preciso primeiro criar os dados das outras collections pois
// pois a collection "Games" recebe os dados de todas as outras collections, como publishers, developers, genres, etc.
// Logo, se a collection "Games" fosse criada primeiro, seria apresentado um erro, pois a mesma tem relações com todas as outras collections.
// Segue o mesmo princípio do método "createManyToManyData"
async function createGames(products) {
    await Promise.all(
        products.map(async (product) => {
            const item = await getByName(product.title, 'api::game.game');

            if (item === true) {
                console.info(`Creating: ${product.title}...`);
                const game = await strapi.db.query('api::game.game').create({
                    data: {
                        name: product.title,

                        slug: product.slug.replace(/_/g, '-'),
                        price: product.price.amount,
                        release_date: new Date(
                            Number(product.globalReleaseDate) * 1000).toISOString(),
                        categories: await Promise.all(
                            product.genres.map((name) => getID(name, 'api::category.category'))
                        ),
                        platforms: await Promise.all(
                            product.supportedOperatingSystems.map((name) => getID(name, 'api::platform.platform'))),
                        developers: [await getID(product.developer, 'api::developer.developer')],
                        publisher: await getID(product.publisher, 'api::publisher.publisher'),
                        ...(await getGameInfo(product.slug)),
                        
                    },                                      

                });
                //faz o upload das imagens
                await setImage({ image: product.image, game });
                await Promise.all(product.gallery.slice(0, 5).map((url) => setImage({ image: url, game, field: 'gallery' })));
                await timeOut(2000);

                return game;
            }
        })
    );
}
async function setImage({ image, game, field = "cover" }) {

    try {
        const url = `https:${image}_bg_crop_1680x655.jpg`;
        const { data } = await axios.get(url, { responseType: "arraybuffer" });
        const buffer = Buffer.from(data, "base64");

        const FormData = require("form-data");
        const formData = new FormData();

        formData.append("refId", game.id);
        formData.append("ref", "api::game.game");
        formData.append("field", field);
        formData.append("files", buffer, { filename: `${game.slug}.jpg` });

        console.info(`Uploading ${field} image: ${game.slug}.jpg`);

        await axios({
            method: "POST",
            url: `http://${strapi.config.host}:${strapi.config.port}/api/upload`,
            //url: `http://0.0.0.0:1337/upload`,
            data: formData,
            headers: {
                "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
            },
        });

    } catch (error) {
        console.log("populate", Exception(e));
    }
}


module.exports = {
    populate: async (params) => {

        try {

            const gogApiUrl = `https://www.gog.com/games/ajax/filtered?mediaType=game&${qs.stringify(params)}`;

            const { data: { products } } = await axios.get(gogApiUrl);

            //console.log(products[4].title);
            //await create(products[0].publisher, 'api::publisher.publisher')
            //await create(products[0].developer, 'api::developer.developer')
            await createManytoManyData(products);
            await createGames(products);


        } catch (e) {
            console.log('Populate', Exception(e));
        }
    },
};