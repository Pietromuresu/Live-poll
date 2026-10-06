using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Live_poll.Migrations
{
    /// <inheritdoc />
    public partial class AddPollSlug : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "slug",
                table: "polls",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_polls_slug",
                table: "polls",
                column: "slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_polls_slug",
                table: "polls");

            migrationBuilder.DropColumn(
                name: "slug",
                table: "polls");
        }
    }
}
