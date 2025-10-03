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
  });
});