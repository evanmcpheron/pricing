#!/usr/bin/env ts-node

import * as fs from 'fs';

// Define interfaces for PriceType and Product
interface PriceType {
    key: string;
    displayName: string;
}

interface Product {
    normalPrice: number;
    clearancePrice: number;
    quantityInStock: number;
    priceInCart: boolean;
}

interface PriceTypeStats {
    count: number;
    prices: number[];
}

// Function to read input data from a file or return a default case
function readInput(): Promise<string> {
    return new Promise((resolve) => {
        const txtFile = process.argv[2];
        if (txtFile) {
            // Read from file
            fs.readFile(txtFile, 'utf8', (err, data) => {
                if (err) {
                    console.error("Error reading file:", err);
                    resolve('');
                } else {
                    resolve(data);
                }
            });
        } else {
            console.log("No input file provided. Returning default report.");
            resolve('');
        }
    });
}

// Function to parse a line into a PriceType or Product
function parseLine(line: string): { type: 'priceType' | 'product', data: PriceType | Product } | null {
    const tokens = line.split(',');
    if (tokens[0] === 'Type') {
        return {
            type: 'priceType',
            data: {
                key: tokens[1],
                displayName: tokens[2]
            } as PriceType
        };
    } else if (tokens[0] === 'Product') {
        return {
            type: 'product',
            data: {
                normalPrice: parseFloat(tokens[1]),
                clearancePrice: parseFloat(tokens[2]),
                quantityInStock: parseInt(tokens[3], 10),
                priceInCart: tokens[4].toLowerCase() === 'true'
            } as Product
        };
    }
    return null;
}

// Function to classify products and update stats
function classifyProducts(products: Product[], priceTypes: PriceType[]): { [key: string]: PriceTypeStats } {
    const priceTypeStats: { [key: string]: PriceTypeStats } = {};

    // Initialize stats for each price type
    for (const priceType of priceTypes) {
        priceTypeStats[priceType.key] = { count: 0, prices: [] };
    }
    priceTypeStats['price_in_cart'] = { count: 0, prices: [] };

    for (const product of products) {
        let typeKey = product.clearancePrice < product.normalPrice ? 'clearance' : 'normal';

        if (product.priceInCart) {
            priceTypeStats['price_in_cart'].count++;
        }

        priceTypeStats[typeKey].count++;
        priceTypeStats[typeKey].prices.push(product.clearancePrice);
    }

    return priceTypeStats;
}

// Function to generate report lines from stats
function generateReport(priceTypes: PriceType[], stats: { [key: string]: PriceTypeStats }): string[] {
    return priceTypes.map(priceType => {
        const data = stats[priceType.key];
        let line = `${priceType.displayName}: ${data.count} ${data.count === 1 ? 'product' : 'products'}`;

        if (data.prices.length > 0) {
            const minPrice = Math.min(...data.prices);
            const maxPrice = Math.max(...data.prices);
            if (minPrice === maxPrice) {
                line += ` @ $${minPrice.toFixed(2)}`;
            } else {
                line += ` @ $${minPrice.toFixed(2)}-$${maxPrice.toFixed(2)}`;
            }
        }

        return line;
    });
}

// Main function to process the data and generate the report
async function main() {
    try {
        const inputData = await readInput();
        const lines = inputData.trim().split('\n');

        const priceTypes: PriceType[] = [
            { key: 'normal', displayName: 'Normal Price' },
            { key: 'clearance', displayName: 'Clearance Price' },
            { key: 'price_in_cart', displayName: 'Price In Cart' }
        ];
        const products: Product[] = [];

        // Parse the input data if available
        if (lines.length > 0) {
            for (const line of lines) {
                const parsedLine = parseLine(line);
                if (parsedLine) {
                    if (parsedLine.type === 'product') {
                        products.push(parsedLine.data as Product);
                    }
                }
            }
        }

        // Filter available products and classify them
        const availableProducts = products.filter(product => product.quantityInStock >= 3);
        const priceTypeStats = classifyProducts(availableProducts, priceTypes);

        // Generate and display report
        const reportLines = generateReport(priceTypes, priceTypeStats);
        reportLines.forEach(line => console.log(line));

        // Handle the default case when no file is provided
        if (lines.length === 0) {
            console.log("Price In Cart: 0 products");
        }

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
