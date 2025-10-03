import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { BiodiversityCredits_LatinHack } from "../typechain-types";

// Describe el conjunto de pruebas para el contrato BiodiversityCredits_LatinHack con verificador por proyecto
describe("BiodiversityCredits_LatinHack", function () {
  
  let contract: BiodiversityCredits_LatinHack;
  let admin: HardhatEthersSigner;
  let developer: HardhatEthersSigner;
  let verifier1: HardhatEthersSigner;
  let verifier2: HardhatEthersSigner; // Un segundo verificador para probar la lógica de permisos
  let creditOwner: HardhatEthersSigner;
  let anotherUser: HardhatEthersSigner;

  const projectURI = "ipfs://some-project-metadata";
  const methodologyHash = ethers.encodeBytes32String("METODOLOGIA_V1");
  const PROJECT_ID_0 = 0;
  const STATUS_PENDING = 0;
  const STATUS_APPROVED = 1;
  const STATUS_REJECTED = 2;

  beforeEach(async function () {
    [admin, developer, verifier1, verifier2, creditOwner, anotherUser] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BiodiversityCredits_LatinHack");
    contract = await Factory.deploy(admin.address); 
    await contract.waitForDeployment();
  });

  describe("Despliegue y Roles Iniciales", function () {
    it("Debería establecer el admin correctamente en el despliegue", async function () {
      expect(await contract.admin()).to.equal(admin.address);
    });
  });

  describe("Ciclo de Vida del Proyecto", function () {
    it("Debería permitir a un desarrollador registrar un nuevo proyecto", async function () {
      await expect(contract.connect(developer).registerProject(verifier1.address, projectURI, methodologyHash))
        .to.emit(contract, "ProjectRegistered")
        .withArgs(PROJECT_ID_0, developer.address, verifier1.address);
      
      const project = await contract.projects(PROJECT_ID_0);
      expect(project.developer).to.equal(developer.address);
      expect(project.verifier).to.equal(verifier1.address);
      expect(project.status).to.equal(STATUS_PENDING);
    });

    it("Debería permitir al admin aprobar un proyecto", async function () {
      await contract.connect(developer).registerProject(verifier1.address, projectURI, methodologyHash);
      await expect(contract.connect(admin).updateProjectStatus(PROJECT_ID_0, STATUS_APPROVED))
        .to.emit(contract, "ProjectStatusUpdated")
        .withArgs(PROJECT_ID_0, STATUS_APPROVED);

      const project = await contract.projects(PROJECT_ID_0);
      expect(project.status).to.equal(STATUS_APPROVED);
    });

    it("Debería impedir que un no-admin actualice el estado de un proyecto", async function () {
      await contract.connect(developer).registerProject(verifier1.address, projectURI, methodologyHash);
      await expect(
        contract.connect(developer).updateProjectStatus(PROJECT_ID_0, STATUS_APPROVED)
      ).to.be.revertedWith("Llamador no es el admin");
    });

    it("Debería impedir el registro de un proyecto con el verificador como direccion cero", async function () {
      const zeroAddress = ethers.ZeroAddress;
      await expect(
        contract.connect(developer).registerProject(zeroAddress, projectURI, methodologyHash)
      ).to.be.revertedWith("El verificador no puede ser la direccion cero");
    });

    it("Debería fallar al intentar actualizar el estado de un proyecto inexistente", async function () {
      const nonExistentProjectId = 999;
      await expect(
        contract.connect(admin).updateProjectStatus(nonExistentProjectId, STATUS_APPROVED)
      ).to.be.revertedWith("El proyecto no existe");
    });
  });

  describe("certifyAndMintBatch (Acuñación)", function () {
    beforeEach(async function () {
      // Preparamos un proyecto aprobado para los tests de acuñación
      await contract.connect(developer).registerProject(verifier1.address, projectURI, methodologyHash);
      await contract.connect(admin).updateProjectStatus(PROJECT_ID_0, STATUS_APPROVED);
    });

    it("Debería permitir al verificador del proyecto acuñar créditos", async function () {
      const amount = 100;
      const FIRST_CREDIT_ID = 0;
      await expect(contract.connect(verifier1).certifyAndMintBatch(PROJECT_ID_0, creditOwner.address, amount))
        .to.emit(contract, "CreditBatchCertified");

      expect(await contract.balanceOf(creditOwner.address, FIRST_CREDIT_ID)).to.equal(amount);
      const batchDetails = await contract.creditBatchDetails(FIRST_CREDIT_ID);
      expect(batchDetails.projectId).to.equal(PROJECT_ID_0);
    });

    it("Debería impedir que un verificador de OTRO proyecto acuñe créditos", async function () {
      const amount = 100;
      await expect(
        contract.connect(verifier2).certifyAndMintBatch(PROJECT_ID_0, creditOwner.address, amount)
      ).to.be.revertedWith("Llamador no es el verificador de este proyecto");
    });

    it("Debería impedir la acuñación para un proyecto que no está aprobado", async function () {
      const NEW_PROJECT_ID = 1;
      await contract.connect(developer).registerProject(verifier1.address, "uri2", methodologyHash); // Este proyecto está 'Pending'
      const amount = 100;
      await expect(
        contract.connect(verifier1).certifyAndMintBatch(NEW_PROJECT_ID, creditOwner.address, amount)
      ).to.be.revertedWith("El proyecto no esta aprobado");
    });

    it("Debería impedir la acuñación de créditos para la dirección cero", async function () {
      const amount = 100;
      const zeroAddress = ethers.ZeroAddress;
      // El verificador intenta acuñar créditos para la dirección nula
      await expect(
        contract.connect(verifier1).certifyAndMintBatch(PROJECT_ID_0, zeroAddress, amount)
      ).to.be.revertedWith("ERC1155: no se puede acunar a la direccion cero");
    });
  });

  describe("Funcionalidad ERC-1155 (Transferencia, Quema, Aprobación)", function () {
    const amountMinted = 1000;
    const FIRST_CREDIT_ID = 0;

    beforeEach(async function () {
      // Flujo completo para tener créditos con los que trabajar
      await contract.connect(developer).registerProject(verifier1.address, projectURI, methodologyHash);
      await contract.connect(admin).updateProjectStatus(PROJECT_ID_0, STATUS_APPROVED);
      await contract.connect(verifier1).certifyAndMintBatch(PROJECT_ID_0, creditOwner.address, amountMinted);
    });

    it("Debería permitir al dueño de los créditos transferir una porción", async function () {
      const transferAmount = 300;
      await contract.connect(creditOwner).safeTransferFrom(creditOwner.address, anotherUser.address, FIRST_CREDIT_ID, transferAmount, "0x");
      
      const ownerBalance = amountMinted - transferAmount;
      expect(await contract.balanceOf(creditOwner.address, FIRST_CREDIT_ID)).to.equal(ownerBalance);
      expect(await contract.balanceOf(anotherUser.address, FIRST_CREDIT_ID)).to.equal(transferAmount);
    });

    it("Debería permitir a un operador aprobado transferir créditos", async function () {
      const transferAmount = 500;
      await contract.connect(creditOwner).setApprovalForAll(admin.address, true);
      await contract.connect(admin).safeTransferFrom(creditOwner.address, anotherUser.address, FIRST_CREDIT_ID, transferAmount, "0x");

      const ownerBalance = amountMinted - transferAmount;
      expect(await contract.balanceOf(creditOwner.address, FIRST_CREDIT_ID)).to.equal(ownerBalance);
    });

    it("Debería permitir al dueño de los créditos retirarlos (quemarlos)", async function () {
      const retireAmount = 250;
      await contract.connect(creditOwner).retireCredits(FIRST_CREDIT_ID, retireAmount);
      
      const ownerBalance = amountMinted - retireAmount;
      expect(await contract.balanceOf(creditOwner.address, FIRST_CREDIT_ID)).to.equal(ownerBalance);
    });

    it("Debería impedir una transferencia por una cuenta no autorizada", async function () {
      const transferAmount = 100;
      // 'anotherUser' intenta transferir los créditos de 'creditOwner'
      await expect(
        contract.connect(anotherUser).safeTransferFrom(creditOwner.address, anotherUser.address, FIRST_CREDIT_ID, transferAmount, "0x")
      ).to.be.revertedWith("ERC1155: no autorizado para transferir");
    });

    it("Debería impedir la transferencia de créditos a la direccion cero", async function () {
      const transferAmount = 100;
      const zeroAddress = ethers.ZeroAddress;
      await expect(
        contract.connect(creditOwner).safeTransferFrom(creditOwner.address, zeroAddress, FIRST_CREDIT_ID, transferAmount, "0x")
      ).to.be.revertedWith("ERC1155: no se puede transferir a la direccion cero");
    });

    it("Debería impedir la transferencia de una cantidad mayor al balance", async function () {
      const transferAmount = amountMinted + 1; // Intentamos transferir más de lo que se acuñó
      await expect(
        contract.connect(creditOwner).safeTransferFrom(creditOwner.address, anotherUser.address, FIRST_CREDIT_ID, transferAmount, "0x")
      ).to.be.revertedWith("ERC1155: balance insuficiente");
    });

    it("Debería impedir la quema de créditos por una cuenta no autorizada", async function () {
      const retireAmount = 100;
      // 'anotherUser' intenta quemar los créditos de 'creditOwner'
      await expect(
        contract.connect(anotherUser).retireCredits(FIRST_CREDIT_ID, retireAmount)
      ).to.be.revertedWith("ERC1155: balance insuficiente para quemar");
    });

    it("Debería impedir la quema de una cantidad mayor al balance", async function () {
      const retireAmount = amountMinted + 1; // Intentamos quemar más de lo que se acuñó
      await expect(
        contract.connect(creditOwner).retireCredits(FIRST_CREDIT_ID, retireAmount)
      ).to.be.revertedWith("ERC1155: balance insuficiente para quemar");
    });
    
    it("Debería permitir al dueño de los créditos quemarlos directamente via burn", async function () {
      const burnAmount = 150;
      // 'creditOwner' quema sus propios tokens
      await contract.connect(creditOwner).burn(creditOwner.address, FIRST_CREDIT_ID, burnAmount);
      
      const expectedBalance = amountMinted - burnAmount;
      expect(await contract.balanceOf(creditOwner.address, FIRST_CREDIT_ID)).to.equal(expectedBalance);
    });

    it("Debería impedir que una cuenta no autorizada llame a burn sobre los fondos de otra", async function () {
      const burnAmount = 100;
      // 'anotherUser' intenta quemar los créditos de 'creditOwner'
      await expect(
        contract.connect(anotherUser).burn(creditOwner.address, FIRST_CREDIT_ID, burnAmount)
      ).to.be.revertedWith("ERC1155: no autorizado para quemar");
    });

    it("Debería impedir la quema de una cantidad mayor al balance via burn", async function () {
      const burnAmount = amountMinted + 1;
      await expect(
        contract.connect(creditOwner).burn(creditOwner.address, FIRST_CREDIT_ID, burnAmount)
      ).to.be.revertedWith("ERC1155: balance insuficiente para quemar");
    });

    it("Debería permitir a un operador aprobado quemar créditos en nombre del propietario", async function () {
      const burnAmount = 200;
      // 'creditOwner' aprueba al 'admin' como un operador para todos sus tokens
      await contract.connect(creditOwner).setApprovalForAll(admin.address, true);

      // El 'admin' (operador) ahora llama a 'burn' especificando que los fondos son de 'creditOwner'
      await expect(contract.connect(admin).burn(creditOwner.address, FIRST_CREDIT_ID, burnAmount))
        .to.emit(contract, "TransferSingle"); // Verificamos que el evento de transferencia (a la dirección cero) fue emitido

      const expectedBalance = amountMinted - burnAmount;
      expect(await contract.balanceOf(creditOwner.address, FIRST_CREDIT_ID)).to.equal(expectedBalance);
    });
  });
});