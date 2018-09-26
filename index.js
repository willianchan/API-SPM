const mysql = require('mysql');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
// parse application/x-www-form-urlencoded
//app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json());

//Database connection
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mydb'
});
connection.connect();

//Funcoes
function LastIndexOfInterval(num, lista) {
  for (i = 0; i < 5; i++) {
    if ((x = lista.lastIndexOf(num - i)) != -1) {
      return x;
    }
  }
  return -1;
}

Date.prototype.getWeek = function() {
  var d = new Date(
    Date.UTC(this.getFullYear(), this.getMonth(), this.getDate())
  );
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

//Rotas
app.get('/', function(req, res) {
  res.send('Bem vindo à API SmartParkingMaua');
});

/**
 * POST carrosPost
 * Summary: Adiciona um novo carro
 * Notes:
 * Output-Formats: [application/json]
 */
app.post('/v1/carros', function(req, res) {
  idEstacionamento = req.body.idEstacionamento;
  timestamp = req.body.timestamp;
  estado = req.body.estado;

  //identifica estacionamento(0 e 1 são portaria)
  if (idEstacionamento < 2) {
    query =
      'INSERT INTO tbl_portaria (idportaria, timestamp, acao) VALUES (?, FROM_UNIXTIME(?), ?)';
  } else {
    query =
      'INSERT INTO tbl_bolsao (idbolsao, timestamp, acao) VALUES (?, FROM_UNIXTIME(?), ?)';
  }

  connection.query(query, [idEstacionamento, timestamp, estado], function(
    error,
    results,
    fields
  ) {
    if (error) {
      res.status(400);
      res.send(
        JSON.stringify({
          code: 400,
          type: 'error',
          message: error
        })
      );
    } else {
      res.status(201);
      res.send(results);
    }
  });
});

/**
 * GET estacionamentosGet
 * Summary: Retorna os estacionamentos e seus id&#39;s
 * Notes: Retorna um array com o nome e id de todos os estacionamentos registrados
 * Output-Formats: [application/json]
 */
app.get('/v1/estacionamentos', function(req, res) {
  connection.query('SELECT * from tbl_atual', function(error, results, fields) {
    if (error) {
      res.status(400);
      res.send(JSON.stringify({
        code: 400,
        type: 'error',
        message: error
      }));
    } else {
      retorno = [];
      results.forEach(element => {
        retorno.push({
          name: element.nome,
          id: element.idbp
        });
      });

      retorno = { estacionamentos: retorno };

      res.status(200);
      res.send(JSON.stringify(retorno));
    }
  });
});

/**
 * GET estacionamentosIdFindByHourGet
 * Summary: Retorna a quantidade de carros por hora
 * Notes: Retorna dois arrays de 12 elementos cada, sendo um de entrada e um de saida, com a quantidade de carros no estacionamento a cada 5 minutos, completando uma hora no total
 * Output-Formats: [application/json]
 */
app.get('/v1/estacionamentos/:id/findByHour', function(req, res) {
  idEstacionamento = req.params.id;
  timestamp = req.query.timestamp;

  var data = new Date(timestamp * 1000);

  var ano = data.getFullYear();
  var mes = '0' + (data.getMonth() + 1);
  var dia = '0' + data.getDate();
  var dataFormatada = ano + '-' + mes.substr(-2) + '-' + dia.substr(-2);

  var horas = data.getHours();
  var minutos = '0' + data.getMinutes();
  var segundos = '0' + data.getSeconds();
  var tempoFormatado =
    horas + ':' + minutos.substr(-2) + ':' + segundos.substr(-2);

  //identifica estacionamento(0 e 1 são portaria)
  if (idEstacionamento < 2) {
    query =
      'SELECT timestamp, acao FROM tbl_portaria WHERE idportaria=? AND date(timestamp) = ? AND hour(timestamp) = ?';
  } else {
    query =
      'SELECT timestamp, acao FROM tbl_bolsao WHERE idbolsao=? AND date(timestamp) = ? AND hour(timestamp) = ?';
  }
  var entrada = [];
  var saida = [];
  connection.query(query, [idEstacionamento, dataFormatada, horas], function(
    error,
    results,
    fields
  ) {
    if (error) {
      res.status(400);
      res.send(JSON.stringify({
        code: 400,
        type: 'error',
        message: error
      }));
    } else {
      //separa em entrada e saida(em minutos)
      results.forEach(element => {
        let ts = new Date(element.timestamp);
        let minute = ts.getMinutes();

        if (element.acao == 'entrada') {
          entrada.push(minute);
        } else if (element.acao == 'saida') {
          saida.push(minute);
        }
      });
      //filtra array em 12 partes e separa a cada 5 min
      entrada.sort();
      saida.sort();

      listaEntrada = [];
      listaSaida = [];

      lista = [4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59];

      lista.forEach(element => {
        listaEntrada.push(
          entrada.splice(0, LastIndexOfInterval(element, entrada) + 1).length
        );
        listaSaida.push(
          saida.splice(0, LastIndexOfInterval(element, saida) + 1).length
        );
      });

      retorno = {
        entrada: listaEntrada,
        saida: listaSaida
      };

      res.status(200);
      res.send(retorno);
    }
  });
});

/**
 * GET estacionamentosIdFindByDayGet
 * Summary: Retorna a quantidade de carros por dia
 * Notes: Retorna dois arrays de 24 elementos cada, sendo um de entrada e um de saida, com a quantidade de carros no estacionamento a cada hora, completando um dia no total
 * Output-Formats: [application/json]
 */
app.get('/v1/estacionamentos/:id/findByDay', function(req, res) {
  idEstacionamento = req.params.id;
  timestamp = req.query.timestamp;

  var data = new Date(timestamp * 1000);

  var ano = data.getFullYear();
  var mes = '0' + (data.getMonth() + 1);
  var dia = '0' + data.getDate();
  var dataFormatada = ano + '-' + mes.substr(-2) + '-' + dia.substr(-2);

  var horas = data.getHours();
  var minutos = '0' + data.getMinutes();
  var segundos = '0' + data.getSeconds();
  var tempoFormatado =
    horas + ':' + minutos.substr(-2) + ':' + segundos.substr(-2);

  //identifica estacionamento(0 e 1 são portaria)
  if (idEstacionamento < 2) {
    query =
      'SELECT timestamp, acao FROM tbl_portaria WHERE idportaria=? AND date(timestamp) = ?';
  } else {
    query =
      'SELECT timestamp, acao FROM tbl_bolsao WHERE idbolsao=? AND date(timestamp) = ?';
  }
  var entrada = [];
  var saida = [];
  connection.query(query, [idEstacionamento, dataFormatada], function(
    error,
    results,
    fields
  ) {
    if (error) {
      res.status(400);
      res.send(JSON.stringify({
        code: 400,
        type: 'error',
        message: error
      }));
    } else {
      //separa em entrada e saida(em horas)
      results.forEach(element => {
        let ts = new Date(element.timestamp);
        let hora = ts.getHours();

        if (element.acao == 'entrada') {
          entrada.push(hora);
        } else if (element.acao == 'saida') {
          saida.push(hora);
        }
      });
      //filtra array em 12 partes e separa a cada 5 min
      entrada.sort();
      saida.sort();

      listaEntrada = [];
      listaSaida = [];

      lista = [
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23
      ];

      lista.forEach(element => {
        listaEntrada.push(
          entrada.splice(0, entrada.lastIndexOf(element) + 1).length
        );
        listaSaida.push(saida.splice(0, saida.lastIndexOf(element) + 1).length);
      });

      retorno = {
        entrada: listaEntrada,
        saida: listaSaida
      };

      res.status(200);
      res.send(retorno);
    }
  });
});

/**
 * GET estacionamentosIdFindByWeekGet
 * Summary: Retorna a quantidade de carros dos proximos 7 dias
 * Notes: Retorna 7 objetos, um para cada dia da semana, e cada objeto possui dois arrays de 24 elementos cada, sendo um de entrada e um de saida, com a quantidade de carros no estacionamento a cada hora, completando um dia no total, para cada dia da semana
 * Output-Formats: [application/json]
 */
app.get('/v1/estacionamentos/:id/findByWeek', function(req, res) {
  idEstacionamento = req.params.id;
  timestamp = req.query.timestamp;

  var data = new Date(timestamp * 1000);

  var ano = data.getFullYear();
  var mes = '0' + (data.getMonth() + 1);
  var dia = '0' + data.getDate();
  var dataFormatada = ano + '-' + mes.substr(-2) + '-' + dia.substr(-2);

  var horas = data.getHours();
  var minutos = '0' + data.getMinutes();
  var segundos = '0' + data.getSeconds();
  var tempoFormatado =
    horas + ':' + minutos.substr(-2) + ':' + segundos.substr(-2);

  //var semana = data.getWeek();
  //identifica estacionamento(0 e 1 são portaria)
  if (idEstacionamento < 2) {
    query =
      'SELECT hour(timestamp) as hora, acao, dayofweek(timestamp) as diaDaSemana FROM tbl_portaria WHERE idportaria=? AND year(timestamp) = ? and week(timestamp) = week(FROM_UNIXTIME(?))';
  } else {
    query =
      'SELECT hour(timestamp) as hora, acao, dayofweek(timestamp) as diaDaSemana FROM tbl_bolsao WHERE idbolsao=? AND year(timestamp) = ? and week(timestamp) = week(FROM_UNIXTIME(?))';
  }
  var entrada = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];
  var saida = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];
  connection.query(query, [idEstacionamento, ano, timestamp], function(
    error,
    results,
    fields
  ) {
    if (error) {
      res.status(400);
      res.send(JSON.stringify({
        code: 400,
        type: 'error',
        message: error
      }));
    } else {
      //separa em entrada e saida(em horas)
      results.forEach(element => {
        //let ts = new Date(element.timestamp);
        let diaDaSemana = element.diaDaSemana;
        let hora = element.hora;

        if (element.acao == 'entrada') {
          entrada[diaDaSemana][hora] += 1;
        } else if (element.acao == 'saida') {
          saida[diaDaSemana][hora] += 1;
        }
      });

      retorno = {
        segunda: { entrada: entrada[1], saida: saida[1] },
        terca: { entrada: entrada[2], saida: saida[2] },
        quarta: { entrada: entrada[3], saida: saida[3] },
        quinta: { entrada: entrada[4], saida: saida[4] },
        sexta: { entrada: entrada[5], saida: saida[5] },
        sabado: { entrada: entrada[6], saida: saida[6] },
        domingo: { entrada: entrada[0], saida: saida[0] }
      };

      res.status(200);
      res.send(retorno);
    }
  });
});

/**
 * GET estacionamentosIdFindByMonthGet
 * Summary: Retorna a quantidade de carros por mes
 * Notes: Retorna 5 objetos, um para cada semana, e cada objeto possui 7 objetos, um para cada dia da semana, e cada objeto possui dois arrays de 24 elementos cada, sendo um de entrada e um de saida, com a quantidade de carros no estacionamento a cada hora, completando um dia no total, para cada dia da semana
 * Output-Formats: [application/json]
 */
app.get('/v1/estacionamentos/:id/findByMonth', function(req, res) {
  idEstacionamento = req.params.id;
  timestamp = req.query.timestamp;

  var data = new Date(timestamp * 1000);

  var ano = data.getFullYear();
  var mes = '0' + (data.getMonth() + 1);
  var dia = '0' + data.getDate();
  var dataFormatada = ano + '-' + mes.substr(-2) + '-' + dia.substr(-2);

  var horas = data.getHours();
  var minutos = '0' + data.getMinutes();
  var segundos = '0' + data.getSeconds();
  var tempoFormatado =
    horas + ':' + minutos.substr(-2) + ':' + segundos.substr(-2);

  //var semana = data.getWeek();
  //identifica estacionamento(0 e 1 são portaria)
  if (idEstacionamento < 2) {
    query =
      'SELECT hour(timestamp) as hora, acao, dayofweek(timestamp) as diaDaSemana FROM tbl_portaria WHERE idportaria=? AND year(timestamp) = ? and week(timestamp) = week(FROM_UNIXTIME(?))';
  } else {
    query =
      'SELECT hour(timestamp) as hora, acao, dayofweek(timestamp) as diaDaSemana FROM tbl_bolsao WHERE idbolsao=? AND year(timestamp) = ? and week(timestamp) = week(FROM_UNIXTIME(?))';
  }
  var entrada = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];
  var saida = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];
  connection.query(query, [idEstacionamento, ano, timestamp], function(
    error,
    results,
    fields
  ) {
    if (error) {
      res.status(400);
      res.send(JSON.stringify({
        code: 400,
        type: 'error',
        message: error
      }));
    } else {
      //separa em entrada e saida(em horas)
      results.forEach(element => {
        //let ts = new Date(element.timestamp);
        //TODO - ACHAR SEMANA MINIMA week()
        let diaDaSemana = element.diaDaSemana;
        let hora = element.hora;

        if (element.acao == 'entrada') {
          entrada[diaDaSemana][hora] += 1;
        } else if (element.acao == 'saida') {
          saida[diaDaSemana][hora] += 1;
        }
      });

      retorno = {
        segunda: { entrada: entrada[1], saida: saida[1] },
        terca: { entrada: entrada[2], saida: saida[2] },
        quarta: { entrada: entrada[3], saida: saida[3] },
        quinta: { entrada: entrada[4], saida: saida[4] },
        sexta: { entrada: entrada[5], saida: saida[5] },
        sabado: { entrada: entrada[6], saida: saida[6] },
        domingo: { entrada: entrada[0], saida: saida[0] }
      };

      res.status(200);
      res.send(retorno);
    }
  });
});

var server = app.listen(3000);
console.log('Servidor Express iniciado na porta %s', server.address().port);
