import API, { extractData } from "./api";

export async function getTaxConfig() {
  const response = await API.get("/tax-config");
  return extractData(response) || {
    itemSgstPercent: 0,
    itemCgstPercent: 0,
    serviceSgstPercent: 0,
    serviceCgstPercent: 0,
    itemTaxPercent: 0,
    serviceTaxPercent: 0,
    platformFee: 0,
    transportationFee: 100,
    rules: [],
  };
}
