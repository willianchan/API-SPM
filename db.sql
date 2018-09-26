-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema id3479526_smartparkingmaua
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema id3479526_smartparkingmaua
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `id3479526_smartparkingmaua` DEFAULT CHARACTER SET latin1 ;
USE `id3479526_smartparkingmaua` ;

-- -----------------------------------------------------
-- Table `id3479526_smartparkingmaua`.`tbl_atual`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `id3479526_smartparkingmaua`.`tbl_atual` (
  `idbp` INT(11) NOT NULL,
  `nome` VARCHAR(45) CHARACTER SET 'utf8' NOT NULL,
  `vagas_ocupadas` INT(11) NOT NULL,
  `max_vagas` INT(11) NOT NULL,
  PRIMARY KEY (`idbp`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `id3479526_smartparkingmaua`.`tbl_bolsao`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `id3479526_smartparkingmaua`.`tbl_bolsao` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `idbolsao` INT(11) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `acao` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 12
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `id3479526_smartparkingmaua`.`tbl_portaria`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `id3479526_smartparkingmaua`.`tbl_portaria` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `idportaria` INT(11) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `acao` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 16
DEFAULT CHARACTER SET = latin1;

USE `id3479526_smartparkingmaua`;

DELIMITER $$
USE `id3479526_smartparkingmaua`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `id3479526_smartparkingmaua`.`EntradaCarroBolsao`
BEFORE INSERT ON `id3479526_smartparkingmaua`.`tbl_bolsao`
FOR EACH ROW
UPDATE tbl_atual SET tbl_atual.vagas_ocupadas = tbl_atual.vagas_ocupadas + 1 WHERE tbl_atual.idbp = new.idbolsao AND new.acao = "entrada"$$

USE `id3479526_smartparkingmaua`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `id3479526_smartparkingmaua`.`SaidaCarroBolsao`
AFTER INSERT ON `id3479526_smartparkingmaua`.`tbl_bolsao`
FOR EACH ROW
UPDATE tbl_atual SET tbl_atual.vagas_ocupadas = tbl_atual.vagas_ocupadas - 1 WHERE tbl_atual.idbp = new.idbolsao AND new.acao = "saida"$$

USE `id3479526_smartparkingmaua`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `id3479526_smartparkingmaua`.`EntradaCarroPortaria`
BEFORE INSERT ON `id3479526_smartparkingmaua`.`tbl_portaria`
FOR EACH ROW
UPDATE tbl_atual SET tbl_atual.vagas_ocupadas = tbl_atual.vagas_ocupadas + 1 WHERE tbl_atual.idbp = new.idportaria AND new.acao = "entrada"$$

USE `id3479526_smartparkingmaua`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `id3479526_smartparkingmaua`.`SaidaCarroPortaria`
AFTER INSERT ON `id3479526_smartparkingmaua`.`tbl_portaria`
FOR EACH ROW
UPDATE tbl_atual SET tbl_atual.vagas_ocupadas = tbl_atual.vagas_ocupadas - 1 WHERE tbl_atual.idbp = new.idportaria AND new.acao = "saida"$$


DELIMITER ;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
