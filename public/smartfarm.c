#include <stdio.h>
#include <stdlib.h>
#include <string.h>


void print_header()
{
    printf("Content-Type: application/json\n\n");
}


int main()
{
    char *content_length;
    int length;

    char data[5000];


    content_length = getenv("CONTENT_LENGTH");


    if (content_length == NULL)
    {
        print_header();

        printf("{\"error\":\"No data received\"}");

        return 1;
    }


    length = atoi(content_length);


    if (length > 4999)
    {
        length = 4999;
    }


    fread(data, 1, length, stdin);

    data[length] = '\0';


    print_header();


    printf("{");

    printf("\"message\":");

    printf("\"SmartFarm AI received your farming request. ");

    printf("For the AI version, this C backend can send the request ");

    printf("to a free AI model API and return the generated advice.\"");

    printf("}");


    return 0;
}