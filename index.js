const mysql = require('mysql');
const express = require('express');
const bodyParser = require('body-parser');

const port = 8080;

const app = express();
app.use(bodyParser.json());

//Conexao pool ao db
const pool = mysql.createPool({
  connectionLimit: 100,
  host: 'smartparkingmaua.mysql.database.azure.com',
  user: 'adminspm@smartparkingmaua',
  password: 'Smartparkingmaua123',
  database: 'smartparkingmaua',
  debug: false
});

//FUNCOES
Date.prototype.getWeek = function() {
  var date = new Date(this.getTime());
   date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  // January 4 is always in week 1.
  var week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getNumPrimeiraSemanaMes(timestamp) {
  date = new Date(timestamp*1000);
  ano = date.getFullYear();
  mes = date.getMonth();
  data = new Date(ano, mes, 1);
  return data.getWeek();
}

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
  
  pool.query(query, [idEstacionamento, timestamp, estado], function(
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
      res.end();
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
  pool.query('SELECT * from tbl_atual', function(error, results, fields) {
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

  //identifica estacionamento(0 e 1 são portaria)
  if (idEstacionamento < 2) {
    query =
      'SELECT minute(timestamp) as minuto, acao FROM tbl_portaria WHERE idportaria=? AND date(timestamp) = date(FROM_UNIXTIME(?)) AND hour(timestamp) = hour(FROM_UNIXTIME(?))';
  } else {
    query =
      'SELECT minute(timestamp) as minuto, acao FROM tbl_bolsao WHERE idbolsao=? AND date(timestamp) = date(FROM_UNIXTIME(?)) AND hour(timestamp) = hour(FROM_UNIXTIME(?))';
  }

  pool.query(query, [idEstacionamento, timestamp, timestamp], function(
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
      //separa em entrada e saida
      var entrada = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var saida = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      results.forEach(element => {
        let minuto = element.minuto;

        if (element.acao == 'entrada') {
          entrada[Math.floor(minuto / 5)] += 1;
        } else if (element.acao == 'saida') {
          saida[Math.floor(minuto / 5)] += 1;
        }
      });

      retorno = {
        entrada: entrada,
        saida: saida
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

  //identifica estacionamento(0 e 1 são portaria)
  if (idEstacionamento < 2) {
    query =
      'SELECT hour(timestamp) as hora, acao FROM tbl_portaria WHERE idportaria=? AND date(timestamp) = date(FROM_UNIXTIME(?))';
  } else {
    query =
      'SELECT hour(timestamp) as hora, acao FROM tbl_bolsao WHERE idbolsao=? AND date(timestamp) = date(FROM_UNIXTIME(?))';
  }

  pool.query(query, [idEstacionamento, timestamp], function(
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
      //separa em entrada e saida(em horas)
      var entrada = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var saida = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      results.forEach(element => {
        let hora = element.hora;

        if (element.acao == 'entrada') {
          entrada[hora] += 1;
        } else if (element.acao == 'saida') {
          saida[hora] += 1;
        }
      });

      retorno = {
        entrada: entrada,
        saida: saida
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

  //identifica estacionamento(0 e 1 são portaria)
  if (idEstacionamento < 2) {
    query =
      'SELECT hour(timestamp) as hora, acao, dayofweek(timestamp) as diaDaSemana FROM tbl_portaria WHERE idportaria=? AND year(timestamp) = year(FROM_UNIXTIME(?)) and week(timestamp) = week(FROM_UNIXTIME(?))';
  } else {
    query =
      'SELECT hour(timestamp) as hora, acao, dayofweek(timestamp) as diaDaSemana FROM tbl_bolsao WHERE idbolsao=? AND year(timestamp) = year(FROM_UNIXTIME(?)) and week(timestamp) = week(FROM_UNIXTIME(?))';
  }

  pool.query(query, [idEstacionamento, timestamp, timestamp], function(
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
      //separa em entrada e saida(em horas)
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

      results.forEach(element => {
        let diaDaSemana = element.diaDaSemana;
        let hora = element.hora;

        if (element.acao == 'entrada') {
          entrada[diaDaSemana-1][hora] += 1;
        } else if (element.acao == 'saida') {
          saida[diaDaSemana-1][hora] += 1;
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

  //identifica estacionamento(0 e 1 são portaria)
  if (idEstacionamento < 2) {
    query =
      'SELECT week(timestamp) as semanaDoAno, hour(timestamp) as hora, acao, dayofweek(timestamp) as diaDaSemana FROM tbl_portaria WHERE idportaria=? AND year(timestamp) = year(FROM_UNIXTIME(?)) and month(timestamp) = month(FROM_UNIXTIME(?))';
  } else {
    query =
      'SELECT week(timestamp) as semanaDoAno, hour(timestamp) as hora, acao, dayofweek(timestamp) as diaDaSemana FROM tbl_bolsao WHERE idbolsao=? AND year(timestamp) = year(FROM_UNIXTIME(?)) and month(timestamp) = month(FROM_UNIXTIME(?))';
  }

  pool.query(query, [idEstacionamento, timestamp, timestamp], function(
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
      //separa em entrada e saida(em horas)
      var entrada = [[[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]];
      var saida = [[[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]];
      
      //ACHA SEMANA MINIMA DO MES DADO
      var semanaMinima = getNumPrimeiraSemanaMes(timestamp);

      results.forEach(element => {
        let semanaDoMes = element.semanaDoAno - semanaMinima + 1;
        let diaDaSemana = element.diaDaSemana;
        let hora = element.hora;

        if (element.acao == 'entrada') {
          entrada[semanaDoMes][diaDaSemana-1][hora] += 1;
        } else if (element.acao == 'saida') {
          saida[semanaDoMes][diaDaSemana-1][hora] += 1;
        }
      });

      retorno = {
        1: {
          segunda: { entrada: entrada[0][1], saida: saida[0][1] },
          terca: { entrada: entrada[0][2], saida: saida[0][2] },
          quarta: { entrada: entrada[0][3], saida: saida[0][3] },
          quinta: { entrada: entrada[0][4], saida: saida[0][4] },
          sexta: { entrada: entrada[0][5], saida: saida[0][5] },
          sabado: { entrada: entrada[0][6], saida: saida[0][6] },
          domingo: { entrada: entrada[0][0], saida: saida[0][0] }
        },
        2: {
          segunda: { entrada: entrada[1][1], saida: saida[1][1] },
          terca: { entrada: entrada[1][2], saida: saida[1][2] },
          quarta: { entrada: entrada[1][3], saida: saida[1][3] },
          quinta: { entrada: entrada[1][4], saida: saida[1][4] },
          sexta: { entrada: entrada[1][5], saida: saida[1][5] },
          sabado: { entrada: entrada[1][6], saida: saida[1][6] },
          domingo: { entrada: entrada[1][0], saida: saida[1][0] }
        },
        3: {
          segunda: { entrada: entrada[2][1], saida: saida[2][1] },
          terca: { entrada: entrada[2][2], saida: saida[2][2] },
          quarta: { entrada: entrada[2][3], saida: saida[2][3] },
          quinta: { entrada: entrada[2][4], saida: saida[2][4] },
          sexta: { entrada: entrada[2][5], saida: saida[2][5] },
          sabado: { entrada: entrada[2][6], saida: saida[2][6] },
          domingo: { entrada: entrada[2][0], saida: saida[2][0] }
        },
        4: {
          segunda: { entrada: entrada[3][1], saida: saida[3][1] },
          terca: { entrada: entrada[3][2], saida: saida[3][2] },
          quarta: { entrada: entrada[3][3], saida: saida[3][3] },
          quinta: { entrada: entrada[3][4], saida: saida[3][4] },
          sexta: { entrada: entrada[3][5], saida: saida[3][5] },
          sabado: { entrada: entrada[3][6], saida: saida[3][6] },
          domingo: { entrada: entrada[3][0], saida: saida[3][0] }
        },
        5: {
          segunda: { entrada: entrada[4][1], saida: saida[4][1] },
          terca: { entrada: entrada[4][2], saida: saida[4][2] },
          quarta: { entrada: entrada[4][3], saida: saida[4][3] },
          quinta: { entrada: entrada[4][4], saida: saida[4][4] },
          sexta: { entrada: entrada[4][5], saida: saida[4][5] },
          sabado: { entrada: entrada[4][6], saida: saida[4][6] },
          domingo: { entrada: entrada[4][0], saida: saida[4][0] }
        },
        6: {
          segunda: { entrada: entrada[5][1], saida: saida[5][1] },
          terca: { entrada: entrada[5][2], saida: saida[5][2] },
          quarta: { entrada: entrada[5][3], saida: saida[5][3] },
          quinta: { entrada: entrada[5][4], saida: saida[5][4] },
          sexta: { entrada: entrada[5][5], saida: saida[5][5] },
          sabado: { entrada: entrada[5][6], saida: saida[5][6] },
          domingo: { entrada: entrada[5][0], saida: saida[5][0] }
        }
      };

      res.status(200);
      res.send(retorno);
    }
  });
});

var server = app.listen(port);
console.log('Servidor Express iniciado na porta %s', server.address().port);
