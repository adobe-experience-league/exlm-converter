import * as WebImporter from '@adobe/helix-importer';


export default function createTable(document) {

    /*
        replace all below elements with divs and add class="table" as shown below
        <table>   to  <div class="table"> 
            <thead>
                <tr><th>innerHTML</th></tr>
            </thead>
            <tbody>
                <tr><td>innerHTML</td></tr>
            </tbody>
        </table>
    */

    const tableElements = Array.from(document.getElementsByTagName("table"));
    tableElements.forEach(function (element) {

        const tableElement = element.cloneNode(true);
        const divTable = document.createElement('div');
        divTable.classList.add('table');

        const tabRows = Array.from(tableElement.rows);
        tabRows.forEach(function (tabRow) {
            let trDiv = document.createElement('div');
            const cells = Array.from(tabRow.cells);
            cells.forEach(function (cell) {
                let tdDiv = document.createElement('div');
                tdDiv.innerHTML = cell.innerHTML;
                trDiv.appendChild(tdDiv);
            })
            divTable.appendChild(trDiv);

        });

        element.parentNode.replaceChild(divTable, element);
    });
}