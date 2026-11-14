# Notes on local-first software

Author: Ada Larkin (fictional). Date: 2026-11-10. This is invented demo text.

Local-first software keeps the primary copy of your data on your own device. A server may help with syncing,
but the app keeps working when the network is gone, and your data does not disappear if the vendor does.

Three ideas carry most of the weight.

First, plain text formats outlive applications. A folder of Markdown files can be opened by hundreds of tools,
today and in twenty years. A proprietary database can be read only by the program that wrote it.

Second, the app should work offline by default. Waiting for a server before you can type a note is a design
failure, not a connectivity problem.

Third, syncing should be boring. In my own use, with one person writing on two computers, sync conflicts are rare:
I have seen perhaps three in a year, and each took a minute to settle.

The practical advice is short: store data as files you can read, keep a copy you control, and treat the cloud as
a convenience, not as the owner of your notes.
