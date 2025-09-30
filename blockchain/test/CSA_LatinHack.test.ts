import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { CSA_LatinHack } from "../typechain-types";

describe("CSA_LatinHack (ERC-1155)", function () {
  
  let csa: CSA_LatinHack;
  let owner: HardhatEthersSigner;
  let member1: HardhatEthersSigner;
  let member2: HardhatEthersSigner;
  let nonMember: HardhatEthersSigner;
  const SEASON_ID = 0;
  const price = ethers.parseEther("0.5");

  beforeEach(async function () {
    [owner, member1, member2, nonMember] = await ethers.getSigners();
    const CSA_LatinHack_Factory = await ethers.getContractFactory("CSA_LatinHack");
    csa = await CSA_LatinHack_Factory.deploy(owner.address); 
    await csa.waitForDeployment();
  });

  // --- Orden de los tests sigue el orden de las funciones en el contrato ---

  describe("constructor", function () {
    it("Debería establecer el propietario correcto al desplegar", async function () {
      expect(await csa.owner()).to.equal(owner.address);
    });
  });

  describe("createNewSeason", function () {
    it("Debería permitir al propietario crear una nueva temporada", async function () {      
      await csa.connect(owner).createNewSeason("Verano 2024", price, 100, 12);
    });

    it("Debería impedir que no propietarios creen una nueva temporada", async function () {      
      await expect(
        csa.connect(member1).createNewSeason("Verano 2024", price, 100, 12)
      ).to.be.revertedWith("CSA: Quien llama no es el propietario");
    });
  });

  describe("closeSeasonSales", function() {
    beforeEach(async function() {
      await csa.connect(owner).createNewSeason("Temp", price, 10, 4);
    });

    it("Debería permitir al propietario cerrar las ventas", async function () {      
      await csa.connect(owner).closeSeasonSales(SEASON_ID);
    });

    it("Debería impedir que no propietarios cierren las ventas", async function() {      
       await expect(
        csa.connect(member1).closeSeasonSales(SEASON_ID)
      ).to.be.revertedWith("CSA: Quien llama no es el propietario");
    });
    
    it("Debería fallar al intentar cerrar una temporada que no existe", async function() {
        const invalidSeasonId = 99;        
        await expect(
            csa.connect(owner).closeSeasonSales(invalidSeasonId)
        ).to.be.revertedWith("CSA: ID de temporada invalido");
    });
  });
  
  describe("buyMembership", function () {       
    it("Debería fallar si no hay temporadas creadas", async function () {        
        const newCsa = await ethers.deployContract("CSA_LatinHack", [owner.address]);

        // Intentar comprar una membresía. La transacción debe revertir.        
        await expect(
            newCsa.connect(member1).buyMembership({ value: price })
        ).to.be.revertedWith("CSA: No hay temporadas creadas");
    });
    
    it("Debería acuñar 1 token al miembro si todo es correcto", async function () {
      await csa.connect(owner).createNewSeason("Temp", price, 2, 4);      
      await csa.connect(member1).buyMembership({ value: price });
    });     
    
    it("Debería fallar si las ventas están cerradas", async function () {
        await csa.connect(owner).createNewSeason("Temp", price, 2, 4);
        await csa.connect(owner).closeSeasonSales(SEASON_ID);        
        await expect(
            csa.connect(member1).buyMembership({ value: price })
        ).to.be.revertedWith("CSA: Las ventas estan cerradas");
    });

    it("Debería fallar si todas las membresías están vendidas", async function () {
      await csa.connect(owner).createNewSeason("Temp", price, 2, 4);
      await csa.connect(member1).buyMembership({ value: price });
      await csa.connect(member2).buyMembership({ value: price });      
      await expect(
        csa.connect(nonMember).buyMembership({ value: price }) 
      ).to.be.revertedWith("CSA: Todas las participaciones vendidas");
    });

    it("Debería fallar si se envía la cantidad incorrecta de ETH", async function () {
        await csa.connect(owner).createNewSeason("Temp", price, 2, 4);
        const wrongPrice = ethers.parseEther("0.1");        
        await expect(
            csa.connect(member1).buyMembership({ value: wrongPrice })
        ).to.be.revertedWith("CSA: Monto enviado incorrecto");
    });
  });

  describe("redeemWeeklyBox", function () {
    beforeEach(async function () {
      await csa.connect(owner).createNewSeason("Temp", price, 10, 2);
      await csa.connect(member1).buyMembership({ value: price });
    });

    it("Debería permitir a un miembro canjear su caja semanal", async function () {      
      await expect(csa.connect(member1).redeemWeeklyBox(SEASON_ID))
        .to.emit(csa, "BoxRedeemed");
    });

    it("Debería impedir que un no-miembro canjee una caja", async function () {      
      await expect(
        csa.connect(nonMember).redeemWeeklyBox(SEASON_ID)
      ).to.be.revertedWith("CSA: No eres miembro de esta temporada");
    });

    it("Debería fallar al canjear fuera del período de la temporada", async function() {
        const threeWeeksInSeconds = 21 * 24 * 60 * 60;
        await time.increase(threeWeeksInSeconds);        
        await expect(
            csa.connect(member1).redeemWeeklyBox(SEASON_ID)
        ).to.be.revertedWith("CSA: Fuera del periodo de la temporada");
    });

    it("Debería impedir canjear la misma caja dos veces", async function () {
      await csa.connect(member1).redeemWeeklyBox(SEASON_ID);      
      await expect(
        csa.connect(member1).redeemWeeklyBox(SEASON_ID)
      ).to.be.revertedWith("CSA: La caja de esta semana ya fue canjeada");
    });
  });
  
  describe("withdraw", function() {
    it("Debería permitir al propietario retirar el saldo", async function () {
        await csa.connect(owner).createNewSeason("Temp", price, 10, 4);
        await csa.connect(member1).buyMembership({ value: price });        
        await expect(csa.connect(owner).withdraw()).to.changeEtherBalance(owner, price);
    });
    
    it("Debería ejecutarse con éxito sin transferir ETH si el saldo es cero", async function() {        
        await expect(csa.connect(owner).withdraw()).to.not.be.reverted;
        await expect(csa.connect(owner).withdraw()).to.changeEtherBalance(owner, 0);
    });

    it("Debería impedir que no propietarios retiren el saldo", async function() {
        // Financiamos el contrato para que haya saldo a retirar
        await csa.connect(owner).createNewSeason("Temp", price, 10, 4);
        await csa.connect(member1).buyMembership({ value: price });
                
        await expect(
            csa.connect(member1).withdraw()
        ).to.be.revertedWith("CSA: Quien llama no es el propietario");
    });        
  });

  describe("Funcionalidad ERC-1155", function () {
    const amount = 1;
    beforeEach(async function () {
      await csa.connect(owner).createNewSeason("Temp", price, 10, 4);
      await csa.connect(member1).buyMembership({ value: price });
    });

    it("Debería devolver el balance correcto de un miembro", async function() {        
        expect(await csa.balanceOf(member1.address, SEASON_ID)).to.equal(1);
    });

    it("Debería fallar al llamar balanceOf para la dirección cero", async function() {        
        await expect(csa.balanceOf(ethers.ZeroAddress, SEASON_ID)
        ).to.be.revertedWith("ERC1155: direccion invalida");
    });
    
    it("Debería permitir al dueño del token transferirlo él mismo", async function () {        
        await csa.connect(member1).safeTransferFrom(member1.address, member2.address, SEASON_ID, amount, "0x");
    });
    
    it("Debería permitir a un operador aprobado transferir", async function () {
      await csa.connect(member1).setApprovalForAll(owner.address, true);      
      await csa.connect(owner).safeTransferFrom(member1.address, member2.address, SEASON_ID, amount, "0x");
    });
    
    it("Debería impedir que un no-propietario no-aprobado transfiera", async function () {        
        await expect(
            csa.connect(nonMember).safeTransferFrom(member1.address, member2.address, SEASON_ID, amount, "0x")
        ).to.be.revertedWith("ERC1155: no autorizado");
    });
    
    it("Debería impedir la transferencia a la dirección cero", async function() {        
        await expect(
            csa.connect(member1).safeTransferFrom(member1.address, ethers.ZeroAddress, SEASON_ID, amount, "0x")
        ).to.be.revertedWith("ERC1155: no se puede transferir a la direccion cero");
    });

    it("Debería impedir transferir más tokens de los que se poseen", async function () {
      const tooMuchAmount = 2;      
      await expect(
        csa.connect(member1).safeTransferFrom(member1.address, member2.address, SEASON_ID, tooMuchAmount, "0x")
      ).to.be.revertedWith("ERC1155: balance insuficiente");
    });

    it("Debería permitir quemar tokens", async function() {        
        await csa.connect(member1).burn(member1.address, SEASON_ID, amount);
    });

    it("Debería impedir que un no-propietario queme los tokens", async function() {        
        await expect(
            csa.connect(nonMember).burn(member1.address, SEASON_ID, amount)
        ).to.be.revertedWith("ERC1155: solo el propietario puede quemar");
    });

    it("Debería impedir quemar más tokens de los que se poseen", async function() {
        const tooMuchAmount = 2;        
        await expect(
            csa.connect(member1).burn(member1.address, SEASON_ID, tooMuchAmount)
        ).to.be.revertedWith("ERC1155: balance insuficiente para quemar");
    });
  });

  describe("TestCSALatinHackHelper: Suplemento de Cobertura", function() {
    it("Debería fallar _mint si se intenta acuñar para la dirección cero", async function() {
        // Para probar una función privada, creamos un contrato 'auxiliar' que la expone.
        const TestHelperFactory = await ethers.getContractFactory("TestCSALatinHackHelper");
        const helper = await TestHelperFactory.deploy(owner.address);
        
        await expect(
            helper.testMint(ethers.ZeroAddress, 0, 1)
        ).to.be.revertedWith("ERC1155: no se puede acunar a la direccion cero");
    });
  });

describe("transferOwnership", function() {
    it("Debería permitir al propietario transferir la propiedad", async function() {        
        await csa.connect(owner).transferOwnership(member1.address);
        expect(await csa.owner()).to.equal(member1.address);
    });

    it("Debería impedir que no propietarios transfieran la propiedad", async function() {        
        await expect(
            csa.connect(member1).transferOwnership(member2.address)
        ).to.be.revertedWith("CSA: Quien llama no es el propietario");
    });
  });

  describe("TestWithdrawalFailTester: Suplemento de Cobertura)", function() {    
    it("FailTester: Debería ejecutar executeCreateSeason con éxito", async function() {
        const FailTesterFactory = await ethers.getContractFactory("TestWithdrawalFailTester");
        const failTester = await FailTesterFactory.deploy();
        const csaForTest = await ethers.deployContract("CSA_LatinHack", [await failTester.getAddress()]);        
        await expect(
            failTester.executeCreateSeason(await csaForTest.getAddress(), "Temp", price, 10, 4)
        ).to.not.be.reverted;
    });

    it("FailTester: Debería fallar executeCreateSeason si la llamada interna falla", async function() {
        const FailTesterFactory = await ethers.getContractFactory("TestWithdrawalFailTester");
        const failTester = await FailTesterFactory.deploy();        
        await expect(
            failTester.executeCreateSeason(await csa.getAddress(), "Temp", price, 10, 4)
        ).to.be.revertedWith("Llamada externa a createNewSeason fallo");
    });      

    it("FailTester: Debería fallar withdraw si el propietario es un mock que rechaza ETH", async function() {
        const FailTesterFactory = await ethers.getContractFactory("TestWithdrawalFailTester");
        const failTester = await FailTesterFactory.deploy();
        const csaForTest = await ethers.deployContract("CSA_LatinHack", [await failTester.getAddress()]);
        await failTester.executeCreateSeason(await csaForTest.getAddress(), "Temp", price, 10, 4);
        await csaForTest.connect(member1).buyMembership({ value: price });        
        await expect(
            failTester.executeWithdraw(await csaForTest.getAddress())
        ).to.be.revertedWith("Llamada externa a withdraw fallo");
    });    
  });
});