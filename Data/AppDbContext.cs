using Microsoft.EntityFrameworkCore;

namespace Live_poll.Data;

public class AppDbContext : DbContext
{
    public DbSet<Poll> Polls { get; set; }
    public DbSet<PollOption> Options { get; set; }
    public DbSet<Participant> Participants { get; set; }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Poll>(entity =>
        {
            entity.ToTable("polls");

            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnName("id");

            entity.Property(p => p.SessionKey)
                .HasColumnName("session_key")
                .HasMaxLength(6)
                .IsRequired();
            entity.HasIndex(p => p.SessionKey).IsUnique();

            entity.Property(p => p.Slug)
                .HasColumnName("slug")
                .HasMaxLength(120)
                .IsRequired();
            entity.HasIndex(p => p.Slug).IsUnique();

            entity.Property(p => p.Question)
                .HasColumnName("question")
                .IsRequired();

            entity.Property(p => p.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.Property(p => p.ClosedAt)
                .HasColumnName("closed_at");

            entity.HasMany(p => p.Options)
                .WithOne(o => o.Poll)
                .HasForeignKey(o => o.PollId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(p => p.Participants)
                .WithOne(p => p.Poll)
                .HasForeignKey(p => p.PollId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PollOption>(entity =>
        {
            entity.ToTable("options");

            entity.HasKey(o => o.Id);
            entity.Property(o => o.Id).HasColumnName("id");

            entity.Property(o => o.PollId)
                .HasColumnName("poll_id")
                .IsRequired();

            entity.Property(o => o.Text)
                .HasColumnName("text")
                .IsRequired();

            entity.HasOne(o => o.Poll)
                .WithMany(p => p.Options)
                .HasForeignKey(o => o.PollId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Participant>(entity =>
        {
            entity.ToTable("participants");

            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnName("id");

            entity.Property(p => p.PollId)
                .HasColumnName("poll_id")
                .IsRequired();

            entity.Property(p => p.Nickname)
                .HasColumnName("nickname")
                .IsRequired();

            entity.Property(p => p.OptionId)
                .HasColumnName("option_id");

            entity.HasIndex(p => new { p.PollId, p.Nickname }).IsUnique();

            entity.HasOne(p => p.Poll)
                .WithMany(p => p.Participants)
                .HasForeignKey(p => p.PollId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.Option)
                .WithMany(o => o.Participants)
                .HasForeignKey(p => p.OptionId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        base.OnModelCreating(modelBuilder);
    }
}
