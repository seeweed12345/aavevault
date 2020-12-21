const xl = require("excel4node");

// Excel config
const wb = new xl.Workbook();
const gasTest = wb.addWorksheet("GasTest");

const titleStyle = wb.createStyle({
  font: {
    bold: true,
    color: "#FF0800",
    size: 12,
  },
});

gasTest.cell(1, 1).string("Test").style(titleStyle);
gasTest.cell(1, 2).string("Gas").style(titleStyle);

gasTest.column(1).setWidth(40);
gasTest.column(2).setWidth(15);

const log = async (test, gasValue, row) => {
  gasTest.cell(row, 1).string(test);
  gasTest.cell(row, 2).number(gasValue);

  wb.write(`GasTesting.xlsx`);
};

module.exports = log;
